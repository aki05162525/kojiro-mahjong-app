# scoresテーブルのNullable化 - 実装タスク

**Issue**: #54
**URL**: https://github.com/aki05162525/kojiro-mahjong-app/issues/54

## 概要

`scores` テーブルのスコア関連カラムを Nullable に変更し、対局前の状態（卓組・座順は決定済みだが点数は未入力）をDB上で表現できるようにする。

## 背景

現在、節作成時に卓組と座順を確定して保存する必要があるが、点数は対局後に入力される。
しかし、現状のスキーマではスコア関連カラムがすべて `NOT NULL` 制約のため、レコード作成時に必ず値が必要になってしまう。

**Issue #48 (節管理機能実装) の前提タスク**

---

## 現状のスキーマ

**ファイル**: `db/schema/scores.ts`

```typescript
export const scoresTable = pgTable('scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id').notNull().references(() => tablesTable.id),
  playerId: uuid('player_id').notNull().references(() => playersTable.id),
  wind: windEnum('wind').notNull(),
  finalScore: integer('final_score').notNull(),        // ← Nullable化
  scorePt: decimal('score_pt', ...).notNull(),         // ← Nullable化
  rank: integer('rank').notNull(),                     // ← Nullable化
  rankPt: integer('rank_pt').notNull(),                // ← Nullable化
  totalPt: decimal('total_pt', ...).notNull(),         // ← Nullable化
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**制約**:
- `tablePlayerUnique`: 同じ卓に同じプレイヤーは1回のみ
- `tableWindUnique`: 同じ卓に同じ風は1つのみ

---

## 実装タスク

### 1. DBスキーマ変更

**ファイル**: `db/schema/scores.ts`

**変更内容**:
以下のカラムから `.notNull()` を削除:
- `finalScore: integer('final_score')`
- `scorePt: decimal('score_pt', { precision: 10, scale: 1 })`
- `rank: integer('rank')`
- `rankPt: integer('rank_pt')`
- `totalPt: decimal('total_pt', { precision: 10, scale: 1 })`

**変更後**:
```typescript
export const scoresTable = pgTable('scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id').notNull().references(() => tablesTable.id),
  playerId: uuid('player_id').notNull().references(() => playersTable.id),
  wind: windEnum('wind').notNull(),
  finalScore: integer('final_score'),                  // ✅ Nullable
  scorePt: decimal('score_pt', { precision: 10, scale: 1 }), // ✅ Nullable
  rank: integer('rank'),                               // ✅ Nullable
  rankPt: integer('rank_pt'),                          // ✅ Nullable
  totalPt: decimal('total_pt', { precision: 10, scale: 1 }), // ✅ Nullable
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

---

### 2. マイグレーション実行

```bash
bun run db:generate    # マイグレーションSQL生成
bun run db:migrate     # マイグレーション適用（または db:push）
```

**確認**:
- `drizzle/` ディレクトリに新しいマイグレーションファイルが生成される
- ALTER TABLE 文で各カラムの制約が変更される

---

### 3. Zodスキーマの作成・調整

**ファイル**: `src/schemas/scores.ts` (新規作成)

**実装内容**:

```typescript
import { z } from 'zod'

// wind の型定義
export const windSchema = z.enum(['east', 'south', 'west', 'north'])

// 節作成時のスコアスキーマ（スコア未入力状態を許容）
export const createScoreSchema = z.object({
  tableId: z.string().uuid(),
  playerId: z.string().uuid(),
  wind: windSchema,
  // スコア関連は全て nullish (undefined または null を許容)
  finalScore: z.number().int().nullish(),
  scorePt: z.number().nullish(),
  rank: z.number().int().min(1).max(4).nullish(),
  rankPt: z.number().int().nullish(),
  totalPt: z.number().nullish(),
})

// スコア入力・更新時のスキーマ（全て必須）
export const updateScoreSchema = z.object({
  finalScore: z.number().int(),
  scorePt: z.number(),
  rank: z.number().int().min(1).max(4),
  rankPt: z.number().int(),
  totalPt: z.number(),
})

export type CreateScoreInput = z.infer<typeof createScoreSchema>
export type UpdateScoreInput = z.infer<typeof updateScoreSchema>
```

**使い分け**:
- **節作成時**: `createScoreSchema` を使用（スコアは optional）
- **スコア入力時**: `updateScoreSchema` を使用（スコアは必須）

---

### 4. 型定義の調整

**影響範囲**:
- Drizzle の `InferSelectModel<typeof scoresTable>` が `number | null` を返すようになる
- フロントエンド・バックエンドの両方で型ガードが必要

**対応例**:
```typescript
// Repository や Service での型定義
type Score = InferSelectModel<typeof scoresTable>

// 使用時の型ガード
function calculateRanking(scores: Score[]) {
  // 未入力のスコアを除外
  const validScores = scores.filter((score): score is Score & { totalPt: number; rank: number } =>
    score.totalPt !== null && score.rank !== null
  )

  // 型ガード後は number として扱える（非nullアサーション不要）
  return validScores.sort((a, b) => b.totalPt - a.totalPt)
}
```

---

### 5. Repository層の調整（将来実装時）

**ファイル**: `src/server/repositories/scores.ts` (将来作成)

**実装時の考慮事項**:

```typescript
// スコア作成（節作成時）
export async function createScore(data: CreateScoreInput) {
  return await db.insert(scoresTable).values({
    tableId: data.tableId,
    playerId: data.playerId,
    wind: data.wind,
    // スコアは null でも OK
    finalScore: data.finalScore ?? null,
    scorePt: data.scorePt ?? null,
    rank: data.rank ?? null,
    rankPt: data.rankPt ?? null,
    totalPt: data.totalPt ?? null,
  })
}

// スコア更新（対局後）
export async function updateScore(scoreId: string, data: UpdateScoreInput) {
  return await db.update(scoresTable)
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

// ランキング取得（未入力スコアを除外）
export async function getValidScores(sessionId: string) {
  // sessionId に紐づく table の ID一覧を取得
  const tables = await db.query.tablesTable.findMany({
    where: eq(tablesTable.sessionId, sessionId),
    columns: { id: true },
  })
  const tableIds = tables.map((t) => t.id)

  if (tableIds.length === 0) {
    return []
  }

  // tableId で scores を絞り込む
  return await db.query.scoresTable.findMany({
    where: and(
      inArray(scoresTable.tableId, tableIds),
      isNotNull(scoresTable.totalPt), // ← 未入力を除外
    ),
    orderBy: desc(scoresTable.totalPt),
  })
}
```

---

### 6. 集計ロジックの調整（将来実装時）

**考慮事項**:
- ランキング計算、合計ポイント計算などで `totalPt IS NOT NULL` 条件を追加
- 未実施の対局を除外して集計する

**例**:
```typescript
// ランキング取得時 (JOINを使用)
const scores = await db
  .select({
    score: scoresTable,
    table: tablesTable,
    session: sessionsTable,
  })
  .from(scoresTable)
  .innerJoin(tablesTable, eq(scoresTable.tableId, tablesTable.id))
  .innerJoin(sessionsTable, eq(tablesTable.sessionId, sessionsTable.id))
  .where(and(
    eq(sessionsTable.leagueId, leagueId),
    isNotNull(scoresTable.totalPt),  // ← 未入力を除外
  ))
  .orderBy(desc(scoresTable.totalPt))
```

---

## 影響範囲

### 現在の影響
- ✅ **DBスキーマのみ** (他に scores 関連の実装がないため影響なし)

### 将来の影響（Issue #48 実装時）
- `src/schemas/scores.ts` の作成が必要
- Repository/Service 層での型ガード追加
- 集計クエリでの null チェック追加

---

## 実装の流れ

1. **DBスキーマ変更** (`db/schema/scores.ts`)
2. **マイグレーション生成・適用** (`db:generate` → `db:migrate`)
3. **動作確認**
   - Drizzle Studio でスキーマ確認
   - マイグレーションが正しく適用されているか確認
4. **(将来) Zod スキーマ作成** (`src/schemas/scores.ts`)
5. **(将来) Repository/Service 実装時に型ガード追加**

---

## 注意事項

### マイグレーション実行
- ローカル環境で `db:push` または `db:migrate` を実行
- 本番環境では `db:migrate` を使用（履歴管理のため）

### 既存データへの影響
- 現状、scores テーブルにデータがないため影響なし
- 将来的にデータが存在する場合、既存レコードの値は保持される

### 型安全性
- TypeScript の型システムで `number | null` を扱う必要がある
- `!` (non-null assertion) の乱用を避け、適切な型ガードを使用

---

## テスト項目

### スキーマ変更後の確認
- [ ] マイグレーションファイルが生成された
- [ ] マイグレーションが正常に適用された
- [ ] Drizzle Studio でカラム定義が Nullable になっている
- [ ] 新規レコード挿入時にスコアカラムを null で保存できる
- [ ] スコアを後から更新できる

---

## 参考

### Drizzle ORM - Nullable カラム
```typescript
// NOT NULL
column: integer('column').notNull()

// Nullable
column: integer('column')
```

### Zod - Optional vs Nullable vs Nullish
```typescript
// optional: フィールド自体が存在しなくてもOK (undefined)
field: z.number().optional()

// nullable: フィールドは存在するがnull可
field: z.number().nullable()

// nullish: undefined または null を許容 (.optional().nullable() のショートハンド)
field: z.number().nullish()

// 推奨: DB の Nullable カラムには .nullish() を使用
field: z.number().int().nullish()
```
