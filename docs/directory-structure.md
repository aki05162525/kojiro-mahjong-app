# ディレクトリ構成ガイド（Hono RPC対応版）

麻雀リーグ管理アプリのディレクトリ構成とアーキテクチャ設計

**Hono RPCによるエンドツーエンド型安全性を実現**

---

## 📁 推奨ディレクトリ構成

```
/
├── app/
│   ├── (dashboard)/               # フロントエンド画面
│   │   ├── leagues/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # リーグ詳細（APIクライアント使用）
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # リーグ作成フォーム
│   │   │   └── page.tsx          # リーグ一覧
│   │   ├── sessions/
│   │   │   └── [id]/page.tsx     # 節詳細・点数入力
│   │   └── layout.tsx
│   │
│   ├── api/[[...route]]/
│   │   └── route.ts               # Honoエントリーポイント（HTTPハンドラーのみ）
│   │
│   ├── layout.tsx
│   └── page.tsx
│
├── src/
│   ├── server/                    # バックエンド（Hono API）
│   │   ├── routes/
│   │   │   ├── index.ts          # ★★全ルート統合 + AppType エクスポート★★
│   │   │   ├── leagues.ts        # リーグ管理エンドポイント
│   │   │   ├── players.ts        # プレイヤー管理エンドポイント
│   │   │   ├── sessions.ts       # 節管理エンドポイント
│   │   │   ├── scores.ts         # 点数管理エンドポイント
│   │   │   └── rankings.ts       # ランキングエンドポイント
│   │   │
│   │   ├── services/             # ビジネスロジック層
│   │   │   ├── leagues.service.ts
│   │   │   ├── players.service.ts
│   │   │   ├── sessions.service.ts    # 節生成ロジック
│   │   │   ├── scores.service.ts
│   │   │   └── rankings.service.ts    # ランキング計算ロジック
│   │   │
│   │   ├── repositories/         # データアクセス層
│   │   │   ├── leagues.repository.ts
│   │   │   ├── players.repository.ts
│   │   │   ├── sessions.repository.ts
│   │   │   ├── scores.repository.ts
│   │   │   └── base.repository.ts     # 共通リポジトリ基底クラス（任意）
│   │   │
│   │   ├── middleware/           # Hono用ミドルウェア
│   │   │   ├── auth.ts           # Supabase認証チェック
│   │   │   └── error-handler.ts  # エラーハンドリング
│   │   │
│   │   └── validators/           # Zodバリデータ
│   │       ├── leagues.validator.ts
│   │       ├── players.validator.ts
│   │       ├── sessions.validator.ts
│   │       └── scores.validator.ts
│   │
│   └── client/                   # フロントエンド（APIクライアント）
│       ├── api.ts                # ★★Hono RPCクライアント初期化★★
│       ├── hooks/                # React Query hooks
│       │   ├── useLeagues.ts
│       │   ├── usePlayers.ts
│       │   ├── useSessions.ts
│       │   └── useScores.ts
│       └── types.ts              # クライアント用型定義（任意）
│
├── db/                           # データベース層
│   ├── index.ts                  # Drizzleクライアント初期化
│   └── schema/
│       ├── index.ts
│       ├── leagues.ts
│       ├── players.ts
│       ├── sessions.ts
│       ├── tables.ts
│       ├── scores.ts
│       ├── users.ts
│       └── link-requests.ts
│
├── drizzle/                      # マイグレーションファイル
├── docs/                         # ドキュメント
└── public/                       # 静的ファイル
```

---

## 🏗️ アーキテクチャパターン

### 1. バックエンド：3層アーキテクチャ

```
Client Request
      ↓
[ Route Layer ]           ← ルーティング、バリデーション
      ↓
[ Service Layer ]         ← ビジネスロジック、トランザクション
      ↓
[ Repository Layer ]      ← データアクセス、Drizzle ORM
      ↓
   Database
```

### 2. フロントエンド：Hono RPC + React Query

```
React Component
      ↓
[ Custom Hook ]           ← React Query hooks（useLeagues等）
      ↓
[ Hono RPC Client ]       ← 型安全なAPIクライアント
      ↓
[ API Server ]
```

---

## 💡 Hono RPC実装の重要ポイント

### 最重要ファイル

#### 1. **src/server/routes/index.ts** - AppTypeエクスポート

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { errorHandler } from '@/src/server/middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'
import sessionsRoutes from './sessions'
import scoresRoutes from './scores'
import rankingsRoutes from './rankings'

const app = new Hono().basePath('/api')

// グローバルミドルウェア
app.use('*', logger())
app.use('*', cors())
app.onError(errorHandler)

// ★重要: すべてのルートを1つの式でチェーン★
// これによりTypeScriptが完全な型推論を行う
const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/players', playersRoutes)
  .route('/sessions', sessionsRoutes)
  .route('/scores', scoresRoutes)
  .route('/rankings', rankingsRoutes)

// ★AppTypeをエクスポート - クライアントで使用★
export type AppType = typeof routes

// ヘルスチェック
app.get('/health', (c) => c.json({ status: 'ok' }))

export default app
```

**重要ポイント:**
- すべてのルートを**1つの式でチェーン**（TypeScript型推論の要件）
- `app`ではなく`routes`から型をエクスポート
- これにより完全な型推論が可能になる

#### 2. **src/client/api.ts** - Hono RPCクライアント

```typescript
import { hc } from 'hono/client'
// ★重要: type importのみ（実際のコードはインポートしない）★
import type { AppType } from '@/src/server/routes'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ★型安全なAPIクライアント★
export const apiClient = hc<AppType>(baseUrl, {
  // 認証ヘッダーを自動追加（任意）
  headers: async () => {
    const token = localStorage.getItem('supabase_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  },
})
```

**重要ポイント:**
- `import type`のみ使用（バンドルサイズ削減）
- `hc<AppType>()`で型安全なクライアントを初期化
- 認証ヘッダーを自動追加可能

---

## 📝 実装例

### 1. ルート定義（バックエンド）

**src/server/routes/leagues.ts**
```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { authMiddleware } from '@/src/server/middleware/auth'
import { LeaguesService } from '@/src/server/services/leagues.service'
import {
  createLeagueSchema,
  updateLeagueSchema
} from '@/src/server/validators/leagues.validator'

const app = new Hono()
const leaguesService = new LeaguesService()

// すべてのルートに認証を適用
app.use('*', authMiddleware)

// POST /api/leagues - リーグ作成
app.post('/', zValidator('json', createLeagueSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const league = await leaguesService.createLeague(userId, body)
  return c.json(league, 201)
})

// GET /api/leagues - リーグ一覧
app.get('/', async (c) => {
  const userId = c.get('userId')
  const leagues = await leaguesService.getLeaguesByUser(userId)
  return c.json({ leagues })
})

// GET /api/leagues/:id - リーグ詳細
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')

  const league = await leaguesService.getLeagueById(id, userId)
  return c.json(league)
})

// PATCH /api/leagues/:id - リーグ更新
app.patch('/:id', zValidator('json', updateLeagueSchema), async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const league = await leaguesService.updateLeague(id, userId, body)
  return c.json(league)
})

// DELETE /api/leagues/:id - リーグ削除
app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')

  await leaguesService.deleteLeague(id, userId)
  return c.body(null, 204)
})

export default app
```

---

### 2. React Query Hooks（フロントエンド）

**src/client/hooks/useLeagues.ts**
```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../api'
import type { InferRequestType, InferResponseType } from 'hono/client'

// リーグ一覧取得
export function useLeagues() {
  return useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const res = await apiClient.api.leagues.$get()
      if (!res.ok) throw new Error('Failed to fetch leagues')
      return res.json() // ★完全に型推論される★
    },
  })
}

// リーグ詳細取得
export function useLeague(id: string) {
  return useQuery({
    queryKey: ['leagues', id],
    queryFn: async () => {
      const res = await apiClient.api.leagues[':id'].$get({
        param: { id },
      })
      if (!res.ok) throw new Error('Failed to fetch league')
      return res.json()
    },
  })
}

// リーグ作成（型を自動推論）
type CreateRequest = InferRequestType<
  typeof apiClient.api.leagues.$post
>['json']

type CreateResponse = InferResponseType<
  typeof apiClient.api.leagues.$post
>

export function useCreateLeague() {
  const queryClient = useQueryClient()

  return useMutation<CreateResponse, Error, CreateRequest>({
    mutationFn: async (data) => {
      const res = await apiClient.api.leagues.$post({ json: data })
      if (!res.ok) throw new Error('Failed to create league')
      return res.json()
    },
    onSuccess: () => {
      // キャッシュを無効化してリフレッシュ
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

// リーグ更新
type UpdateRequest = InferRequestType<
  typeof apiClient.api.leagues[':id'].$patch
>['json']

export function useUpdateLeague(id: string) {
  const queryClient = useQueryClient()

  return useMutation<CreateResponse, Error, UpdateRequest>({
    mutationFn: async (data) => {
      const res = await apiClient.api.leagues[':id'].$patch({
        param: { id },
        json: data,
      })
      if (!res.ok) throw new Error('Failed to update league')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', id] })
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

// リーグ削除
export function useDeleteLeague(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.api.leagues[':id'].$delete({
        param: { id },
      })
      if (!res.ok) throw new Error('Failed to delete league')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}
```

**ポイント:**
- `InferRequestType`/`InferResponseType`で型を自動推論
- React Queryによる非同期状態管理
- キャッシュの自動無効化

---

### 3. コンポーネントでの使用

**app/(dashboard)/leagues/page.tsx**
```typescript
'use client'

import { useLeagues, useCreateLeague } from '@/src/client/hooks/useLeagues'

export default function LeaguesPage() {
  const { data, isLoading, error } = useLeagues()
  const createLeague = useCreateLeague()

  const handleSubmit = async (formData: FormData) => {
    const players = Array.from({ length: 16 }, (_, i) => ({
      name: formData.get(`player_${i}`) as string,
    }))

    // ★完全に型チェックされる★
    await createLeague.mutateAsync({
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      players,
    })
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <h1>リーグ一覧</h1>
      {data?.leagues.map((league) => (
        <div key={league.id}>
          <h2>{league.name}</h2>
          <p>{league.description}</p>
          {/* ★league の型が完全に推論される★ */}
        </div>
      ))}
    </div>
  )
}
```

---

### 4. サービス層（バックエンド）

**src/server/services/leagues.service.ts**
```typescript
import { LeaguesRepository } from '@/src/server/repositories/leagues.repository'
import { PlayersRepository } from '@/src/server/repositories/players.repository'
import type { CreateLeagueInput } from '@/src/server/validators/leagues.validator'
import { HTTPException } from 'hono/http-exception'

export class LeaguesService {
  private leaguesRepo = new LeaguesRepository()
  private playersRepo = new PlayersRepository()

  async createLeague(userId: string, input: CreateLeagueInput) {
    // ビジネスロジック：プレイヤー数チェック
    const playerCount = input.players.length
    if (playerCount !== 8 && playerCount !== 16) {
      throw new HTTPException(400, {
        message: 'プレイヤーは8人または16人である必要があります',
      })
    }

    // トランザクション処理
    const league = await this.leaguesRepo.create({
      name: input.name,
      description: input.description,
      created_by: userId,
      status: 'active',
    })

    // プレイヤー作成（最初のプレイヤーにadmin権限）
    const players = await Promise.all(
      input.players.map((player, index) =>
        this.playersRepo.create({
          league_id: league.id,
          name: player.name,
          user_id: index === 0 ? userId : null,
          role: index === 0 ? 'admin' : null,
        })
      )
    )

    return { ...league, players }
  }

  async getLeaguesByUser(userId: string) {
    return this.leaguesRepo.findByUserId(userId)
  }

  async getLeagueById(id: string, userId: string) {
    const league = await this.leaguesRepo.findById(id)

    if (!league) {
      throw new HTTPException(404, { message: 'リーグが見つかりません' })
    }

    // アクセス権チェック
    const hasAccess = await this.leaguesRepo.hasUserAccess(id, userId)
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'アクセス権限がありません' })
    }

    const players = await this.playersRepo.findByLeagueId(id)

    return { ...league, players }
  }

  async updateLeague(id: string, userId: string, input: any) {
    await this.checkAdminPermission(id, userId)
    return this.leaguesRepo.update(id, input)
  }

  async deleteLeague(id: string, userId: string) {
    await this.checkAdminPermission(id, userId)
    // 論理削除
    return this.leaguesRepo.update(id, { status: 'deleted' })
  }

  // ヘルパーメソッド
  private async checkAdminPermission(leagueId: string, userId: string) {
    const hasPermission = await this.playersRepo.hasAdminRole(leagueId, userId)
    if (!hasPermission) {
      throw new HTTPException(403, { message: '管理者権限が必要です' })
    }
  }
}
```

---

### 5. リポジトリ層（バックエンド）

**src/server/repositories/leagues.repository.ts**
```typescript
import { db } from '@/db'
import { leagues, players } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export class LeaguesRepository {
  async create(data: typeof leagues.$inferInsert) {
    const [league] = await db.insert(leagues).values(data).returning()
    return league
  }

  async findById(id: string) {
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, id))
    return league
  }

  async findByUserId(userId: string) {
    return db
      .select({
        id: leagues.id,
        name: leagues.name,
        description: leagues.description,
        status: leagues.status,
        created_by: leagues.created_by,
        created_at: leagues.created_at,
        updated_at: leagues.updated_at,
      })
      .from(leagues)
      .innerJoin(players, eq(players.league_id, leagues.id))
      .where(eq(players.user_id, userId))
      .groupBy(leagues.id)
  }

  async update(id: string, data: Partial<typeof leagues.$inferInsert>) {
    const [league] = await db
      .update(leagues)
      .set({ ...data, updated_at: new Date() })
      .where(eq(leagues.id, id))
      .returning()
    return league
  }

  async hasUserAccess(leagueId: string, userId: string) {
    const [result] = await db
      .select({ count: players.id })
      .from(players)
      .where(
        and(
          eq(players.league_id, leagueId),
          eq(players.user_id, userId)
        )
      )
    return !!result
  }
}
```

---

### 6. バリデータ（バックエンド）

**src/server/validators/leagues.validator.ts**
```typescript
import { z } from 'zod'

export const createLeagueSchema = z.object({
  name: z.string().min(1).max(20),
  description: z.string().optional(),
  players: z
    .array(
      z.object({
        name: z.string().min(1).max(20),
      })
    )
    .refine((arr) => arr.length === 8 || arr.length === 16, {
      message: 'プレイヤーは8人または16人である必要があります',
    }),
})

export const updateLeagueSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  description: z.string().optional(),
})

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>
export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>
```

---

### 7. Honoエントリーポイント（Next.js統合）

**app/api/[[...route]]/route.ts**
```typescript
import { handle } from 'hono/vercel'
import app from '@/src/server/routes'

// HonoアプリをNext.js App Routerに統合
export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

---

### 8. 認証ミドルウェア（バックエンド）

**src/server/middleware/auth.ts**
```typescript
import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: '認証が必要です' })
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new HTTPException(401, { message: '無効な認証トークンです' })
  }

  // コンテキストにユーザー情報を設定
  c.set('userId', user.id)
  c.set('user', user)

  await next()
}
```

---

### 9. エラーハンドラー（バックエンド）

**src/server/middleware/error-handler.ts**
```typescript
import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Error:', err)

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.name,
        message: err.message,
        statusCode: err.status,
      },
      err.status
    )
  }

  // Zodバリデーションエラー
  if (err.name === 'ZodError') {
    return c.json(
      {
        error: 'ValidationError',
        message: '入力データが不正です',
        statusCode: 400,
        details: err.errors,
      },
      400
    )
  }

  // その他のエラー
  return c.json(
    {
      error: 'InternalServerError',
      message: 'サーバーエラーが発生しました',
      statusCode: 500,
    },
    500
  )
}
```

---

## ✅ この構成の利点

### 1. **エンドツーエンドの型安全性**
- フロントエンド → バックエンドで完全な型推論
- `InferRequestType`/`InferResponseType`で自動型生成
- コンパイル時にAPI変更を検出

### 2. **3層アーキテクチャの維持**
- Route → Service → Repository
- 各層の責務が明確
- テスタビリティが高い

### 3. **ドメイン駆動設計**
- ドメインごとにファイル分割（leagues, players, sessions...）
- 機能追加が容易
- チーム開発でのコンフリクト回避

### 4. **バンドルサイズ削減**
- 型のみインポート（`import type`）
- 実際のコードはバンドルされない
- フロントエンドのバンドルサイズに影響なし

### 5. **React Queryとの親和性**
- 非同期状態管理が簡単
- キャッシュの自動管理
- Optimistic Updatesも容易

---

## 📚 ベストプラクティス

### ✅ 推奨事項

1. **すべてのルートを1つの式でチェーン**
   - TypeScript型推論に必須
   - `routes`変数から`AppType`をエクスポート

2. **type importのみ使用**
   ```typescript
   import type { AppType } from '@/src/server/routes'
   ```
   - バンドルサイズ削減
   - 実際のコードはインポートしない

3. **React Queryとの統合**
   - Custom Hooksでラップ
   - `InferRequestType`/`InferResponseType`で型推論
   - キャッシュキーを統一的に管理

4. **3層アーキテクチャを維持**
   - Route: ルーティングとバリデーション
   - Service: ビジネスロジック
   - Repository: データアクセス

5. **Zodによるバリデーション**
   - `zValidator`を使用
   - 型安全なバリデーション
   - エラーメッセージのカスタマイズ

### ❌ 避けるべきこと

1. **ルートを個別にマウント（チェーンしない）**
   ```typescript
   // ❌ 悪い例
   app.route('/leagues', leaguesRoutes)
   export type AppType = typeof app  // 型推論が不完全
   ```

2. **実際のコードをインポート**
   ```typescript
   // ❌ 悪い例
   import { AppType } from '@/src/server/routes'  // バンドルに含まれる
   ```

3. **`app`から直接型をエクスポート**
   ```typescript
   // ❌ 悪い例
   export type AppType = typeof app
   ```

---

## 🔧 必要なパッケージ

```json
{
  "dependencies": {
    "hono": "^4.10.4",
    "@hono/zod-validator": "^0.2.0",
    "zod": "^3.22.4",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

**インストール:**
```bash
npm install hono @hono/zod-validator zod @tanstack/react-query
```

---

## 🎯 実装の流れ

### フェーズ1: バックエンド基盤

1. ディレクトリ構成作成
2. `src/server/routes/index.ts`でAppTypeエクスポート
3. 認証ミドルウェア作成
4. エラーハンドラー作成

### フェーズ2: バックエンドAPI実装

1. リポジトリ層実装
2. サービス層実装
3. ルート層実装
4. バリデータ作成

### フェーズ3: フロントエンド統合

1. `src/client/api.ts`でRPCクライアント初期化
2. React Query Hooks作成
3. コンポーネントで使用

---

## 🔗 参考リソース

- **Hono公式ドキュメント**: https://hono.dev/
- **Hono RPC**: https://hono.dev/guides/rpc
- **Drizzle ORM**: https://orm.drizzle.team/
- **React Query**: https://tanstack.com/query
- **Zod**: https://zod.dev/

---

**作成日:** 2025-11-09
**最終更新:** 2025-11-09
