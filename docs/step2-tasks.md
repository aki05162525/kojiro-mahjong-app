# ステップ2: リーグ作成API - 実装タスク

Issue #22のステップ2を自分で実装するためのガイド

**最重要: POST /api/leagues エンドポイントの完全実装**

---

## 前提条件

ステップ1が完了していること：
- ✅ ディレクトリ構成作成済み
- ✅ `src/server/middleware/auth.ts` 実装済み
- ✅ `src/server/middleware/error-handler.ts` 実装済み

---

## タスク1: バリデータ作成

### ファイル: `src/server/validators/leagues.validator.ts`

### 必要なパッケージ

```bash
bun add zod @hono/zod-validator
```

### 実装内容

リクエストボディのバリデーションスキーマを定義

### 実装例

```typescript
import { z } from 'zod'

// プレイヤー名のバリデーション
const playerNameSchema = z.object({
  name: z
    .string()
    .min(1, 'プレイヤー名は必須です')
    .max(20, 'プレイヤー名は20文字以内で入力してください'),
})

// リーグ作成リクエストのバリデーション
export const createLeagueSchema = z.object({
  name: z
    .string()
    .min(1, 'リーグ名は必須です')
    .max(20, 'リーグ名は20文字以内で入力してください'),
  description: z.string().optional(),
  players: z
    .array(playerNameSchema)
    .min(8, 'プレイヤーは8人または16人で指定してください')
    .max(16, 'プレイヤーは8人または16人で指定してください')
    .refine(
      (players) => players.length === 8 || players.length === 16,
      'プレイヤーは8人または16人で指定してください'
    ),
})

// リーグ更新リクエストのバリデーション（オプション）
export const updateLeagueSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  description: z.string().optional(),
})

// ステータス変更リクエストのバリデーション（オプション）
export const updateLeagueStatusSchema = z.object({
  status: z.enum(['active', 'completed', 'deleted']),
})
```

### 実装のポイント

1. **プレイヤー数の厳密なバリデーション**
   - `.refine()` を使って8人または16人のみ許可
   - `min(8)` と `max(16)` でまず範囲を制限
   - さらに `.refine()` で正確に8人または16人をチェック

2. **エラーメッセージ**
   - 日本語でユーザーフレンドリーなメッセージ
   - フロントエンドでそのまま表示可能

3. **型推論**
   - `z.infer<typeof createLeagueSchema>` で型を取得可能

### 📚 公式ドキュメント

- [Zod: Getting Started](https://zod.dev/?id=basic-usage)
- [Zod: Array refinements](https://zod.dev/?id=refine)
- [@hono/zod-validator](https://github.com/honojs/middleware/tree/main/packages/zod-validator)

---

## タスク2: リポジトリ作成

### ファイル: `src/server/repositories/leagues.repository.ts`

### 実装内容

データベース操作を担当するリポジトリ層

### 実装例

```typescript
import { db } from '@/db'
import { leaguesTable, playersTable } from '@/db/schema'
import { eq } from 'drizzle-orm'

// リーグ作成（トランザクション）
export async function createLeagueWithPlayers(data: {
  name: string
  description?: string
  createdBy: string
  players: Array<{ name: string }>
}) {
  return await db.transaction(async (tx) => {
    // 1. リーグを作成
    const [league] = await tx
      .insert(leaguesTable)
      .values({
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
      })
      .returning()

    // 2. プレイヤーを作成
    const playersData = data.players.map((player, index) => ({
      leagueId: league.id,
      name: player.name,
      // 最初のプレイヤー（index: 0）を作成者として紐づけ
      userId: index === 0 ? data.createdBy : null,
      role: index === 0 ? ('admin' as const) : null,
    }))

    const players = await tx.insert(playersTable).values(playersData).returning()

    return {
      ...league,
      players,
    }
  })
}

// リーグ一覧取得（ユーザーが参加しているリーグ）
export async function findLeaguesByUserId(userId: string) {
  return await db
    .select({
      id: leaguesTable.id,
      name: leaguesTable.name,
      description: leaguesTable.description,
      status: leaguesTable.status,
      createdBy: leaguesTable.createdBy,
      createdAt: leaguesTable.createdAt,
      updatedAt: leaguesTable.updatedAt,
    })
    .from(leaguesTable)
    .innerJoin(playersTable, eq(leaguesTable.id, playersTable.leagueId))
    .where(eq(playersTable.userId, userId))
}

// リーグ詳細取得（プレイヤー情報含む）
export async function findLeagueById(leagueId: string) {
  const league = await db.query.leaguesTable.findFirst({
    where: eq(leaguesTable.id, leagueId),
    with: {
      players: {
        columns: {
          id: true,
          name: true,
          userId: true,
          role: true,
          createdAt: true,
        },
      },
    },
  })

  return league
}

// リーグ更新
export async function updateLeague(
  leagueId: string,
  data: { name?: string; description?: string }
) {
  const [updated] = await db
    .update(leaguesTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(leaguesTable.id, leagueId))
    .returning()

  return updated
}

// リーグ削除（論理削除）
export async function deleteLeague(leagueId: string) {
  await db
    .update(leaguesTable)
    .set({
      status: 'deleted',
      updatedAt: new Date(),
    })
    .where(eq(leaguesTable.id, leagueId))
}

// ステータス変更
export async function updateLeagueStatus(
  leagueId: string,
  status: 'active' | 'completed' | 'deleted'
) {
  const [updated] = await db
    .update(leaguesTable)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(leaguesTable.id, leagueId))
    .returning({
      id: leaguesTable.id,
      status: leaguesTable.status,
      updatedAt: leaguesTable.updatedAt,
    })

  return updated
}
```

### 実装のポイント

1. **トランザクション処理**
   - `db.transaction()` でリーグ作成とプレイヤー作成を1つのトランザクションで実行
   - どちらかが失敗した場合、すべてロールバックされる

2. **作成者の自動割り当て**
   - `index === 0` の最初のプレイヤーを作成者として紐づけ
   - 自動的に `role: admin` を設定

3. **リレーショナルクエリ**
   - `db.query.leaguesTable.findFirst()` で `with` を使ってプレイヤー情報を取得
   - Drizzle ORMの型安全なリレーション機能

4. **論理削除**
   - `DELETE` ではなく `UPDATE` でステータスを `deleted` に変更

### 📚 公式ドキュメント

- [Drizzle ORM: Transactions](https://orm.drizzle.team/docs/transactions)
- [Drizzle ORM: Select](https://orm.drizzle.team/docs/select)
- [Drizzle ORM: Insert](https://orm.drizzle.team/docs/insert)
- [Drizzle ORM: Update](https://orm.drizzle.team/docs/update)
- [Drizzle ORM: Relational Queries](https://orm.drizzle.team/docs/rqb)

---

## タスク3: サービス作成

### ファイル: `src/server/services/leagues.service.ts`

### 実装内容

ビジネスロジックを担当するサービス層

### 実装例

```typescript
import { NotFoundError, ForbiddenError } from '../middleware/error-handler'
import * as leaguesRepo from '../repositories/leagues.repository'

// リーグ作成
export async function createLeague(
  userId: string,
  data: {
    name: string
    description?: string
    players: Array<{ name: string }>
  }
) {
  return await leaguesRepo.createLeagueWithPlayers({
    ...data,
    createdBy: userId,
  })
}

// リーグ一覧取得
export async function getLeaguesByUserId(userId: string) {
  const leagues = await leaguesRepo.findLeaguesByUserId(userId)
  return { leagues }
}

// リーグ詳細取得
export async function getLeagueById(leagueId: string, userId: string) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  // ユーザーがリーグに参加しているかチェック
  const isParticipant = league.players.some((player) => player.userId === userId)
  if (!isParticipant) {
    throw new ForbiddenError('このリーグへのアクセス権限がありません')
  }

  return league
}

// リーグ更新
export async function updateLeague(
  leagueId: string,
  userId: string,
  data: { name?: string; description?: string }
) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  // Admin権限チェック
  if (!hasAdminRole(league, userId)) {
    throw new ForbiddenError('リーグを更新する権限がありません')
  }

  return await leaguesRepo.updateLeague(leagueId, data)
}

// リーグ削除
export async function deleteLeague(leagueId: string, userId: string) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  // Admin権限チェック
  if (!hasAdminRole(league, userId)) {
    throw new ForbiddenError('リーグを削除する権限がありません')
  }

  await leaguesRepo.deleteLeague(leagueId)
}

// ステータス変更
export async function updateLeagueStatus(
  leagueId: string,
  userId: string,
  status: 'active' | 'completed' | 'deleted'
) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  // Admin権限チェック
  if (!hasAdminRole(league, userId)) {
    throw new ForbiddenError('ステータスを変更する権限がありません')
  }

  return await leaguesRepo.updateLeagueStatus(leagueId, status)
}

// Admin権限チェックヘルパー
function hasAdminRole(
  league: { players: Array<{ userId: string | null; role: string | null }> },
  userId: string
): boolean {
  return league.players.some((player) => player.userId === userId && player.role === 'admin')
}
```

### 実装のポイント

1. **権限チェック**
   - `hasAdminRole()` ヘルパー関数でAdmin権限を確認
   - 権限がない場合は `ForbiddenError` (403) を投げる

2. **存在チェック**
   - リーグが存在しない場合は `NotFoundError` (404) を投げる

3. **参加者チェック**
   - リーグ詳細取得時に、ユーザーがリーグに参加しているか確認

4. **ビジネスロジックの集約**
   - Repository層はデータアクセスのみ
   - Service層で権限チェックや存在確認などのビジネスロジックを実装

### 📚 関連ファイル

- `src/server/middleware/error-handler.ts` で定義したカスタムエラークラスを使用

---

## タスク4: ルート作成

### ファイル: `src/server/routes/leagues.ts`

### 実装内容

エンドポイントの定義とルーティング

### 実装例

```typescript
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as leaguesService from '../services/leagues.service'
import {
  createLeagueSchema,
  updateLeagueSchema,
  updateLeagueStatusSchema,
} from '../validators/leagues.validator'

const app = new Hono<AuthContext>()

// すべてのルートに認証ミドルウェアを適用
app.use('*', authMiddleware)

// POST /api/leagues - リーグ作成
app.post('/', zValidator('json', createLeagueSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  const league = await leaguesService.createLeague(userId, data)

  return c.json(league, 201)
})

// GET /api/leagues - リーグ一覧
app.get('/', async (c) => {
  const userId = c.get('userId')

  const result = await leaguesService.getLeaguesByUserId(userId)

  return c.json(result, 200)
})

// GET /api/leagues/:id - リーグ詳細
app.get('/:id', async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')

  const league = await leaguesService.getLeagueById(leagueId, userId)

  return c.json(league, 200)
})

// PATCH /api/leagues/:id - リーグ更新
app.patch('/:id', zValidator('json', updateLeagueSchema), async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const data = c.req.valid('json')

  const league = await leaguesService.updateLeague(leagueId, userId, data)

  return c.json(league, 200)
})

// DELETE /api/leagues/:id - リーグ削除
app.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')

  await leaguesService.deleteLeague(leagueId, userId)

  return c.body(null, 204)
})

// PATCH /api/leagues/:id/status - ステータス変更
app.patch('/:id/status', zValidator('json', updateLeagueStatusSchema), async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const { status } = c.req.valid('json')

  const league = await leaguesService.updateLeagueStatus(leagueId, userId, status)

  return c.json(league, 200)
})

export default app
```

### 実装のポイント

1. **認証ミドルウェアの適用**
   - `app.use('*', authMiddleware)` ですべてのルートに認証を適用
   - `AuthContext` 型を指定して `c.get('userId')` が型安全に

2. **バリデーション**
   - `zValidator('json', schema)` でリクエストボディを検証
   - `c.req.valid('json')` で検証済みのデータを取得（型推論される）

3. **ステータスコード**
   - 作成: `201 Created`
   - 取得: `200 OK`
   - 削除: `204 No Content`

4. **パラメータ取得**
   - `c.req.param('id')` でパスパラメータを取得

### 📚 公式ドキュメント

- [Hono: Routing](https://hono.dev/docs/api/routing)
- [Hono: Context](https://hono.dev/docs/api/context)
- [@hono/zod-validator](https://github.com/honojs/middleware/tree/main/packages/zod-validator)

---

## タスク5: AppTypeエクスポート

### ファイル: `src/server/routes/index.ts`

### 実装内容

**Hono RPCの最重要ポイント**: すべてのルートを1つの式でチェーンし、AppTypeをエクスポート

### 実装例

```typescript
import { Hono } from 'hono'
import leaguesRoutes from './leagues'

const app = new Hono().basePath('/api')

// ★すべてのルートを1つの式でチェーン（型推論に必須）
const routes = app.route('/leagues', leaguesRoutes)
// 将来的に追加するルート:
// .route('/sessions', sessionsRoutes)
// .route('/scores', scoresRoutes)

// ★AppTypeをエクスポート（Hono RPCで使用）
export type AppType = typeof routes

export default app
```

### 実装のポイント

1. **1つの式でチェーン**
   ```typescript
   const routes = app.route('/leagues', leaguesRoutes)
   ```
   - 別々の行に分けると型推論が壊れる❌
   - 1つの式で `.route()` をチェーンする✅

2. **AppTypeのエクスポート**
   ```typescript
   export type AppType = typeof routes
   ```
   - `typeof app` ではなく `typeof routes` を使う
   - フロントエンドで `hc<AppType>()` として使用

3. **将来の拡張**
   - 他のルートを追加する際も同じ式にチェーン
   ```typescript
   const routes = app
     .route('/leagues', leaguesRoutes)
     .route('/sessions', sessionsRoutes)
     .route('/scores', scoresRoutes)
   ```

### 📚 公式ドキュメント

- [Hono RPC](https://hono.dev/docs/guides/rpc)
- [Hono: TypeScript Guide](https://hono.dev/docs/guides/typescript)

---

## タスク6: Honoアプリに統合

### ファイル: `app/api/[...route]/route.ts`

### 実装内容

Next.js App Routerのエンドポイントにルートを統合

### 実装例

```typescript
import { handle } from 'hono/vercel'
import app from '@/src/server/routes'

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

### 実装のポイント

1. **既存のコードを置き換え**
   - `const app = new Hono().basePath('/api')` の部分を削除
   - `src/server/routes/index.ts` からインポート

2. **エラーハンドラーは不要**
   - `src/server/routes/index.ts` でまだエラーハンドラーを適用していない場合は、ここで適用：
   ```typescript
   import app from '@/src/server/routes'
   import { errorHandler } from '@/src/server/middleware/error-handler'

   app.onError(errorHandler)

   export const GET = handle(app)
   export const POST = handle(app)
   export const PATCH = handle(app)
   export const DELETE = handle(app)
   ```

### 📚 公式ドキュメント

- [Hono: Vercel Adapter](https://hono.dev/docs/getting-started/vercel)

---

## ステップ2完了チェックリスト

- [ ] `src/server/validators/leagues.validator.ts` が実装された
- [ ] `src/server/repositories/leagues.repository.ts` が実装された
- [ ] `src/server/services/leagues.service.ts` が実装された
- [ ] `src/server/routes/leagues.ts` が実装された
- [ ] `src/server/routes/index.ts` が実装され、AppTypeがエクスポートされた
- [ ] `app/api/[...route]/route.ts` にルートが統合された
- [ ] 型エラーがなく、`bun run lint` が通る
- [ ] `bun run build` が成功する

---

## 動作確認

### ローカルサーバー起動

```bash
bun run dev
```

### APIテスト（curlまたはPostman）

**1. リーグ作成**
```bash
curl -X POST http://localhost:3000/api/leagues \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テストリーグ",
    "description": "16人リーグ",
    "players": [
      {"name": "プレイヤー1"},
      {"name": "プレイヤー2"},
      {"name": "プレイヤー3"},
      {"name": "プレイヤー4"},
      {"name": "プレイヤー5"},
      {"name": "プレイヤー6"},
      {"name": "プレイヤー7"},
      {"name": "プレイヤー8"},
      {"name": "プレイヤー9"},
      {"name": "プレイヤー10"},
      {"name": "プレイヤー11"},
      {"name": "プレイヤー12"},
      {"name": "プレイヤー13"},
      {"name": "プレイヤー14"},
      {"name": "プレイヤー15"},
      {"name": "プレイヤー16"}
    ]
  }'
```

**2. リーグ一覧取得**
```bash
curl http://localhost:3000/api/leagues \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN"
```

**3. リーグ詳細取得**
```bash
curl http://localhost:3000/api/leagues/{LEAGUE_ID} \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN"
```

### トークンの取得方法

1. Supabaseダッシュボードでユーザーを作成
2. フロントエンドでログイン
3. `supabase.auth.getSession()` でトークンを取得
4. または、ブラウザの開発者ツールで `sb-access-token` Cookieを確認

---

## 次のステップへ

ステップ2が完了したら、ステップ3に進みます：

**ステップ3: 残りのエンドポイント実装**
- プレイヤー管理API（2エンドポイント）
- その他のリーグ管理エンドポイント（必要に応じて）

**ステップ4: フロントエンド統合**
- RPCクライアント初期化（`src/client/api.ts`）
- React Query Hooks作成（`src/client/hooks/useLeagues.ts`）

---

**作成日:** 2025-11-12
