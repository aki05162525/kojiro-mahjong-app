# Issue #58: スコア入力・計算機能の実装

**Issue URL**: https://github.com/aki05162525/kojiro-mahjong-app/issues/58

## 現状分析

### 既存の実装状況

| 要素 | 状態 | 詳細 |
|------|------|------|
| DB スキーマ | ✅ 完成 | scores テーブルは全カラム定義済み、NULL 対応 |
| 型定義（TS） | ✅ 完成 | SessionScore, Session インターフェース定義済み |
| セッション作成 | ✅ 完成 | マッチング・スコア初期化済み |
| セッション取得 | ✅ 完成 | GET /api/leagues/:leagueId/sessions |
| OpenAPI スキーマ | ✅ 完成 | SessionScore スキーマ定義済み |
| **スコア計算ロジック** | ❌ 未実装 | scorePt, rankPt, totalPt の計算関数なし |
| **スコア更新 API** | ❌ 未実装 | PUT /api/tables/:tableId/scores なし |
| **スコア更新リポジトリ** | ❌ 未実装 | UPDATE クエリ関数なし |
| **スコア入力バリデーション** | ❌ 未実装 | Zod スキーマ未定義 |
| **フロントエンド** | ❌ 未実装 | フォーム・フック未実装 |

### 計算ルール（docs/rules.md より）

#### 点数ポイント（scorePt）
```
計算式: (点数 - 25,000) ÷ 1,000
小数点: 保持（切り捨てなし）
例: 25,600点 → +0.6pt
```

#### 順位判定
```
1. 点数順でソート（降順）
2. 同点時は座順優先: 東 > 南 > 西 > 北
3. 同点でも rankPt は平均化せず通常配点を適用
```

#### 順位ポイント（rankPt）
```typescript
// テーブルタイプ別の配点
const RANK_POINTS = {
  first:  [40, 30, 20, 10],  // 1位, 2位, 3位, 4位
  upper:  [80, 70, 40, 30],
  lower:  [60, 50, 20, 10],
}
```

#### 合計ポイント（totalPt）
```
totalPt = rankPt + scorePt
```

#### バリデーション
```
4人の finalScore の合計 = 100,000 点（厳密チェック）
```

---

## 実装計画

### Phase 1: バックエンド - スコア計算ロジック

#### 1-1. スコア入力スキーマ定義

**ファイル**: `src/schemas/scores.ts` (新規作成)

```typescript
import { z } from 'zod'

/**
 * スコア入力データ（単一プレイヤー）
 */
export const scoreInputSchema = z.object({
  scoreId: z.string().uuid(),
  finalScore: z.number().int().min(0).max(200000),
})

/**
 * テーブルスコア更新リクエスト
 */
export const updateTableScoresSchema = z.object({
  scores: z.array(scoreInputSchema).length(4),
}).refine(
  (data) => {
    const total = data.scores.reduce((sum, s) => sum + s.finalScore, 0)
    return total === 100000
  },
  {
    message: '4人の合計点数は100,000点である必要があります',
  }
)

export type ScoreInput = z.infer<typeof scoreInputSchema>
export type UpdateTableScoresInput = z.infer<typeof updateTableScoresSchema>
```

**検証内容**:
- 各スコアは 0 ~ 200,000 点の範囲
- 4人分のスコアが必須
- 合計が 100,000 点であることをチェック

---

#### 1-2. スコア計算サービス

**ファイル**: `src/server/services/scores.ts` (新規作成)

```typescript
import type { Wind } from '@/src/schemas/sessions'
import { BadRequestError } from '../middleware/error-handler'

/**
 * 座順の優先度（同点時のタイブレーク用）
 */
const WIND_PRIORITY: Record<Wind, number> = {
  east: 0,
  south: 1,
  west: 2,
  north: 3,
}

/**
 * テーブルタイプ別の順位ポイント配点
 */
const RANK_POINTS: Record<string, number[]> = {
  first: [40, 30, 20, 10],
  upper: [80, 70, 40, 30],
  lower: [60, 50, 20, 10],
}

/**
 * 点数ポイント計算
 */
export function calculateScorePt(finalScore: number): number {
  return (finalScore - 25000) / 1000
}

/**
 * 順位判定（同点時は座順優先）
 */
export function calculateRanks(
  scores: Array<{ scoreId: string; finalScore: number; wind: Wind }>
): Map<string, number> {
  const sorted = [...scores].sort((a, b) => {
    // 点数で降順ソート
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore
    }
    // 同点時は座順優先（東 > 南 > 西 > 北）
    return WIND_PRIORITY[a.wind] - WIND_PRIORITY[b.wind]
  })

  const rankMap = new Map<string, number>()
  sorted.forEach((score, index) => {
    rankMap.set(score.scoreId, index + 1) // 1位, 2位, 3位, 4位
  })

  return rankMap
}

/**
 * 順位ポイント計算
 */
export function calculateRankPt(rank: number, tableType: string): number {
  const points = RANK_POINTS[tableType]
  if (!points) {
    throw new BadRequestError(`不正なテーブルタイプです: ${tableType}`)
  }
  return points[rank - 1] // rank は 1-indexed、配列は 0-indexed
}

/**
 * 合計ポイント計算
 */
export function calculateTotalPt(rankPt: number, scorePt: number): number {
  return rankPt + scorePt
}
```

---

#### 1-3. スコア更新リポジトリ

**ファイル**: `src/server/repositories/scores.ts` (新規作成)

```typescript
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { scoresTable } from '@/db/schema/scores'
import { tablesTable } from '@/db/schema/tables'

/**
 * テーブル情報を取得（tableType 含む）
 */
export async function findTableById(tableId: string) {
  const table = await db.query.tablesTable.findFirst({
    where: eq(tablesTable.id, tableId),
    columns: {
      id: true,
      tableType: true,
      sessionId: true,
    },
  })
  return table
}

/**
 * テーブルの全スコアを取得（wind 含む）
 */
export async function findScoresByTableId(tableId: string) {
  const scores = await db.query.scoresTable.findMany({
    where: eq(scoresTable.tableId, tableId),
    columns: {
      id: true,
      wind: true,
      finalScore: true,
    },
  })
  return scores
}

/**
 * スコアを更新（finalScore, scorePt, rank, rankPt, totalPt）
 */
export async function updateScore(
  scoreId: string,
  data: {
    finalScore: number
    scorePt: string
    rank: number
    rankPt: number
    totalPt: string
  }
) {
  await db
    .update(scoresTable)
    .set({
      finalScore: data.finalScore,
      scorePt: data.scorePt,
      rank: data.rank,
      rankPt: data.rankPt,
      totalPt: data.totalPt,
      updatedAt: new Date(),
    })
    .where(eq(scoresTable.id, scoreId))
}
```

---

#### 1-4. スコア更新サービス（統合）

**ファイル**: `src/server/services/scores.ts` (追記)

```typescript
import * as scoresRepository from '../repositories/scores'
import type { UpdateTableScoresInput } from '@/src/schemas/scores'

/**
 * テーブルスコア一括更新
 */
export async function updateTableScores(
  tableId: string,
  input: UpdateTableScoresInput
) {
  // 1. テーブル情報取得（tableType 必要）
  const table = await scoresRepository.findTableById(tableId)
  if (!table) {
    throw new BadRequestError('テーブルが見つかりません')
  }

  // 2. 既存スコア取得（wind 情報必要）
  const existingScores = await scoresRepository.findScoresByTableId(tableId)
  const windMap = new Map(existingScores.map(s => [s.id, s.wind]))

  // 3. 順位計算
  const scoresWithWind = input.scores.map(s => ({
    scoreId: s.scoreId,
    finalScore: s.finalScore,
    wind: windMap.get(s.scoreId)!,
  }))
  const ranks = calculateRanks(scoresWithWind)

  // 4. 各スコアを計算・更新
  for (const scoreInput of input.scores) {
    const finalScore = scoreInput.finalScore
    const rank = ranks.get(scoreInput.scoreId)!

    const scorePt = calculateScorePt(finalScore)
    const rankPt = calculateRankPt(rank, table.tableType)
    const totalPt = calculateTotalPt(rankPt, scorePt)

    await scoresRepository.updateScore(scoreInput.scoreId, {
      finalScore,
      scorePt: scorePt.toFixed(1),   // 小数点1桁
      rank,
      rankPt,
      totalPt: totalPt.toFixed(1),   // 小数点1桁
    })
  }
}
```

---

### Phase 2: バックエンド - API エンドポイント

#### 2-1. OpenAPI スキーマ定義

**ファイル**: `src/server/schemas/scores.ts` (新規作成)

```typescript
import { z } from '@hono/zod-openapi'
import { scoreInputSchema, updateTableScoresSchema } from '@/src/schemas/scores'

/**
 * スコア入力（OpenAPI 用）
 */
export const ScoreInputSchema = scoreInputSchema
  .extend({
    scoreId: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174001',
      description: 'Score ID',
    }),
    finalScore: z.number().int().min(0).max(200000).openapi({
      example: 25600,
      description: 'Final score (0-200,000)',
    }),
  })
  .openapi('ScoreInput')

/**
 * テーブルスコア更新リクエスト（OpenAPI 用）
 */
export const UpdateTableScoresRequestSchema = updateTableScoresSchema
  .extend({
    scores: z.array(ScoreInputSchema).length(4).openapi({
      description: '4人分のスコア（合計100,000点）',
    }),
  })
  .openapi('UpdateTableScoresRequest')
```

---

#### 2-2. スコア更新エンドポイント

**ファイル**: `src/server/routes/scores.ts` (新規作成)

```typescript
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  BadRequestResponse,
  ForbiddenResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from '../schemas/common'
import { UpdateTableScoresRequestSchema } from '../schemas/scores'
import * as scoresService from '../services/scores'

const app = new OpenAPIHono<AuthContext>()

// 認証ミドルウェア
app.use('*', authMiddleware)

/**
 * PUT /api/tables/:tableId/scores - スコア更新
 */
const updateScoresRoute = createRoute({
  method: 'put',
  path: '/{tableId}/scores',
  tags: ['scores'],
  summary: 'Update table scores',
  description: 'Update all scores for a table and calculate points automatically',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      tableId: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'tableId',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'Table ID',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateTableScoresRequestSchema,
        },
      },
      description: 'Score update request (4 players, total must be 100,000)',
    },
  },
  responses: {
    204: {
      description: 'Successfully updated scores',
    },
    400: BadRequestResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(updateScoresRoute, async (c) => {
  const userId = c.get('userId')
  const tableId = c.req.param('tableId')
  const data = c.req.valid('json')

  await scoresService.updateTableScores(tableId, data)
  return c.body(null, 204)
})

export default app
```

---

#### 2-3. ルート登録

**ファイル**: `src/server/routes/index.ts` (追記)

```typescript
import scoresRoutes from './scores'

const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/leagues', playersRoutes)
  .route('/leagues', sessionsRoutes)
  .route('/tables', scoresRoutes)  // 追加
```

---

### Phase 3: フロントエンド - React Query フック

#### 3-1. スコア更新フック

**ファイル**: `src/client/hooks/useScores.ts` (新規作成)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/src/client/api'
import type { UpdateTableScoresInput } from '@/src/schemas/scores'

/**
 * スコア更新 mutation
 */
export const useUpdateScores = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tableId,
      scores,
    }: {
      tableId: string
      scores: UpdateTableScoresInput
    }) => {
      const res = await apiClient.api.tables[':tableId'].scores.$put({
        param: { tableId },
        json: scores,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update scores')
      }
    },
    onSuccess: (_data, variables) => {
      // セッション一覧を再取得（スコアが更新されたため）
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
```

---

### Phase 4: フロントエンド - スコア入力フォーム

#### 4-1. スコア入力ダイアログ

**ファイル**: `components/features/scores/score-input-dialog.tsx` (新規作成)

```typescript
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useUpdateScores } from '@/src/client/hooks/useScores'
import type { SessionScore } from '@/src/types/session'
import { calculateScorePt, calculateRankPt, calculateTotalPt } from '@/src/client/utils/scoreUtils'

interface ScoreInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableId: string
  tableType: 'first' | 'upper' | 'lower'
  scores: SessionScore[]
}

const WIND_LABELS: Record<string, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
}

export function ScoreInputDialog({
  open,
  onOpenChange,
  tableId,
  tableType,
  scores,
}: ScoreInputDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const updateScores = useUpdateScores()

  // フォーム状態（scoreId → finalScore のマップ）
  const [inputScores, setInputScores] = useState<Record<string, string>>(
    Object.fromEntries(scores.map(s => [s.id, s.finalScore?.toString() || '']))
  )

  // 合計点チェック
  const totalScore = useMemo(() => {
    return Object.values(inputScores).reduce((sum, val) => {
      const num = Number.parseInt(val, 10)
      return sum + (Number.isNaN(num) ? 0 : num)
    }, 0)
  }, [inputScores])

  const isValid = totalScore === 100000

  // リアルタイム計算プレビュー（簡易版）
  const preview = useMemo(() => {
    // TODO: 順位計算・ポイント計算のプレビュー実装
    return null
  }, [inputScores, tableType])

  const handleSubmit = async () => {
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: '入力エラー',
        description: '合計点数は100,000点である必要があります',
      })
      return
    }

    try {
      await updateScores.mutateAsync({
        tableId,
        scores: {
          scores: scores.map(s => ({
            scoreId: s.id,
            finalScore: Number.parseInt(inputScores[s.id], 10),
          })),
        },
      })

      toast({
        title: 'スコアを更新しました',
        description: 'ポイントが自動計算されました',
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to update scores:', error)
      toast({
        variant: 'destructive',
        title: 'スコア更新に失敗しました',
        description: error instanceof Error ? error.message : 'もう一度お試しください',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>スコア入力</DialogTitle>
          <DialogDescription>
            4人分の最終得点を入力してください。合計は100,000点である必要があります。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {scores.map((score) => (
            <div key={score.id} className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                {WIND_LABELS[score.wind]} {score.player.name}
              </Label>
              <Input
                type="number"
                className="col-span-2"
                value={inputScores[score.id]}
                onChange={(e) =>
                  setInputScores({ ...inputScores, [score.id]: e.target.value })
                }
                placeholder="25000"
              />
              <span className="text-sm text-muted-foreground">点</span>
            </div>
          ))}

          <div className="flex items-center justify-between border-t pt-4">
            <span className="font-medium">合計:</span>
            <span
              className={`font-bold ${
                isValid ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {totalScore.toLocaleString()} 点
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateScores.isPending}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || updateScores.isPending}
          >
            {updateScores.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

#### 4-2. クライアント側のユーティリティ（計算プレビュー用）

**ファイル**: `src/client/utils/scoreUtils.ts` (新規作成)

```typescript
// バックエンドと同じロジックをクライアントでも使用
// リアルタイムプレビュー表示用
export function calculateScorePt(finalScore: number): number {
  return (finalScore - 25000) / 1000
}

// ... 他の計算関数も同様に実装
```

---

## 実装の優先順位

### 必須実装（Phase 1 & 2）
1. ✅ スコア入力スキーマ定義（`src/schemas/scores.ts`）
2. ✅ スコア計算ロジック（`src/server/services/scores.ts`）
3. ✅ スコア更新リポジトリ（`src/server/repositories/scores.ts`）
4. ✅ スコア更新エンドポイント（`src/server/routes/scores.ts`）
5. ✅ OpenAPI スキーマ定義（`src/server/schemas/scores.ts`）

### 推奨実装（Phase 3）
6. ✅ React Query フック（`src/client/hooks/useScores.ts`）

### オプション実装（Phase 4）
7. ⚠️ スコア入力ダイアログ（`components/features/scores/score-input-dialog.tsx`）
8. ⚠️ リアルタイムプレビュー機能

---

## テスト観点

### バックエンド
- [ ] 合計点が 100,000 点でない場合にバリデーションエラー
- [ ] 同点時の順位判定（座順優先）
- [ ] 各テーブルタイプでの rankPt 計算
- [ ] scorePt の小数点計算
- [ ] totalPt の合計計算

### フロントエンド
- [ ] 合計点リアルタイム表示
- [ ] 100,000 点でない場合は保存ボタン無効化
- [ ] スコア更新成功後のデータ再取得

---

## 関連ファイル

- `docs/rules.md` - 計算ルール詳細
- `db/schema/scores.ts` - スコアテーブル定義
- `src/types/session.ts` - 型定義
- `src/server/services/sessions.ts` - セッション管理
