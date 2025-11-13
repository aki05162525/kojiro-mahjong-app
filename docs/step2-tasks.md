# ステップ2: リーグ作成API - 実装タスク（段階的アプローチ）

Issue #22のステップ2を自分で実装するためのガイド

**アプローチ**: 最小限の機能で動作確認 → 機能追加

---

## 前提条件

ステップ1が完了していること：
- ✅ ディレクトリ構成作成済み
- ✅ `src/server/middleware/auth.ts` 実装済み
- ✅ `src/server/middleware/error-handler.ts` 実装済み

---

## フェーズ1: リーグ作成APIのみ実装（動作確認まで）

まずは **POST /api/leagues** 1つだけを実装して、エンドツーエンドで動作確認します。

---

## タスク1: バリデータ作成（リーグ作成のみ）

### ファイル: `src/server/validators/leagues.ts`

### 必要なパッケージ

```bash
bun add zod @hono/zod-validator
```

### 実装内容

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
```

### 学習ポイント

1. **Zodの基本的な使い方**
   - `.string()`, `.min()`, `.max()` などのチェーン
   - `.optional()` でオプショナルフィールド

2. **配列のバリデーション**
   - `.array(schema)` で配列の各要素を検証
   - `.refine()` でカスタムロジック（8人または16人）

### 📚 公式ドキュメント

- [Zod: Getting Started](https://zod.dev/?id=basic-usage)
- [Zod: Array refinements](https://zod.dev/?id=refine)

---

## タスク2: リポジトリ作成（リーグ作成のみ）

### ファイル: `src/server/repositories/leagues.ts`

### 実装内容

トランザクションでリーグとプレイヤーを同時に作成

```typescript
import { db } from '@/db'
import { leaguesTable, playersTable } from '@/db/schema'

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

    const players = await tx
      .insert(playersTable)
      .values(playersData)
      .returning()

    return {
      ...league,
      players,
    }
  })
}
```

### 学習ポイント

1. **トランザクションの使い方**
   - `db.transaction(async (tx) => { ... })`
   - トランザクション内では `tx` を使う

2. **INSERT操作**
   - `insert(table).values(data).returning()` の基本構文
   - `.returning()` で挿入したデータを取得

3. **配列操作**
   - `players.map()` でデータを変換
   - `index === 0` で最初のプレイヤーに管理者権限を付与

4. **原子性の保証**
   - どちらかが失敗したら両方ロールバック

### 📚 公式ドキュメント

- [Drizzle ORM: Transactions](https://orm.drizzle.team/docs/transactions)
- [Drizzle ORM: Insert](https://orm.drizzle.team/docs/insert)

---

## タスク3: サービス作成（リーグ作成のみ）

### ファイル: `src/server/services/leagues.ts`

### 実装内容

```typescript
import * as leaguesRepo from '../repositories/leagues'

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
```

### 学習ポイント

1. **サービス層の役割**
   - ビジネスロジックを担当
   - リポジトリ層を呼び出してデータ操作

2. **認証情報の受け渡し**
   - `userId` を受け取って `createdBy` として渡す

---

## タスク4: ルート作成（リーグ作成のみ）

### ファイル: `src/server/routes/leagues.ts`

### 実装内容

```typescript
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as leaguesService from '../services/leagues'
import { createLeagueSchema } from '../validators/leagues'

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

export default app
```

### 学習ポイント

1. **Honoの基本**
   - `new Hono<AuthContext>()` で型付きアプリ作成
   - `app.use('*', middleware)` で全ルートにミドルウェア適用

2. **バリデーション**
   - `zValidator('json', schema)` でリクエストボディを検証
   - `c.req.valid('json')` で検証済みデータを取得

3. **認証情報の取得**
   - `c.get('userId')` でミドルウェアから渡されたユーザーIDを取得

4. **レスポンス**
   - `c.json(data, statusCode)` でJSONレスポンス
   - 作成は `201 Created`

### 📚 公式ドキュメント

- [Hono: Routing](https://hono.dev/docs/api/routing)
- [Hono: Context](https://hono.dev/docs/api/context)
- [@hono/zod-validator](https://github.com/honojs/middleware/tree/main/packages/zod-validator)

---

## タスク5: AppTypeエクスポート

### ファイル: `src/server/routes/index.ts`

### 実装内容

**重要**: Hono RPCで型推論を有効にするための必須ステップ

```typescript
import { Hono } from 'hono'
import leaguesRoutes from './leagues'

const app = new Hono().basePath('/api')

// ★すべてのルートを1つの式でチェーン（型推論に必須）
const routes = app.route('/leagues', leaguesRoutes)

// ★AppTypeをエクスポート（Hono RPCで使用）
export type AppType = typeof routes

export default app
```

### 学習ポイント

1. **型推論のポイント**
   - `app.route()` を1つの式でチェーン
   - `typeof routes` で型をエクスポート

2. **将来の拡張**
   ```typescript
   const routes = app
     .route('/leagues', leaguesRoutes)
     .route('/sessions', sessionsRoutes)  // 後で追加
   ```

### 📚 公式ドキュメント

- [Hono RPC](https://hono.dev/docs/guides/rpc)

---

## タスク6: Honoアプリに統合

### ファイル: `app/api/[...route]/route.ts`

### 実装内容

既存の実装を更新して、ルートを統合

```typescript
import { handle } from 'hono/vercel'
import app from '@/src/server/routes'

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

### 学習ポイント

- Next.js App RouterとHonoの統合
- `handle()` で各HTTPメソッドをハンドリング

---

## フェーズ1完了チェックリスト

- [ ] `src/server/validators/leagues.ts` が実装された
- [ ] `src/server/repositories/leagues.ts` が実装された
- [ ] `src/server/services/leagues.ts` が実装された
- [ ] `src/server/routes/leagues.ts` が実装された
- [ ] `src/server/routes/index.ts` が実装され、AppTypeがエクスポートされた
- [ ] `app/api/[...route]/route.ts` にルートが統合された
- [ ] 型エラーがなく、`bun run lint` が通る

---

## 動作確認

### 1. サーバー起動

```bash
bun run dev
```

### 2. Supabaseでユーザー作成

ブラウザで `http://localhost:3000` を開き、Supabase Authでユーザー登録

### 3. アクセストークン取得

ブラウザの開発者ツールで以下を実行：

```javascript
// Supabaseクライアントがある場合
const { data } = await supabase.auth.getSession()
console.log(data.session.access_token)
```

または、Application > Cookies > `sb-*-auth-token` の値をコピー

### 4. APIテスト

```bash
curl -X POST http://localhost:3000/api/leagues \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テストリーグ",
    "description": "動作確認用",
    "players": [
      {"name": "プレイヤー1"},
      {"name": "プレイヤー2"},
      {"name": "プレイヤー3"},
      {"name": "プレイヤー4"},
      {"name": "プレイヤー5"},
      {"name": "プレイヤー6"},
      {"name": "プレイヤー7"},
      {"name": "プレイヤー8"}
    ]
  }'
```

### 5. 期待される結果

**成功レスポンス（201 Created）**:
```json
{
  "id": "...",
  "name": "テストリーグ",
  "description": "動作確認用",
  "status": "active",
  "createdBy": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "players": [
    {
      "id": "...",
      "name": "プレイヤー1",
      "userId": "...",  // ← あなたのユーザーID
      "role": "admin",  // ← 自動的に付与される
      "createdAt": "..."
    },
    {
      "id": "...",
      "name": "プレイヤー2",
      "userId": null,
      "role": null,
      "createdAt": "..."
    },
    ...
  ]
}
```

### 6. Drizzle Studioで確認

```bash
bun run db:studio
```

`leagues` テーブルと `players` テーブルにデータが入っているか確認

---

## トラブルシューティング

### 401 Unauthorized

- トークンが正しいか確認
- トークンの有効期限を確認
- `.env` の `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しいか確認

### 400 Bad Request

- リクエストボディが正しいか確認
- プレイヤー数が8人または16人か確認

### 500 Internal Server Error

- サーバーログを確認
- データベース接続を確認（`bun run db:studio` で接続できるか）

---

## ✅ フェーズ1が成功したら...

おめでとうございます！最小限の機能が動きました。

次は **フェーズ2** に進みます：追加エンドポイントの実装

---

## フェーズ2: 残りのエンドポイント追加

フェーズ1が動作確認できたら、以下の順番で機能を追加していきます。

---

## タスク7: リーグ一覧取得の追加

### 実装するエンドポイント

**GET /api/leagues** - 自分が参加しているリーグ一覧

### 7-1: リポジトリに関数追加

`src/server/repositories/leagues.ts` に追加：

```typescript
import { eq } from 'drizzle-orm'

// createLeagueWithPlayers の下に追加

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
```

### 7-2: サービスに関数追加

`src/server/services/leagues.ts` に追加：

```typescript
// createLeague の下に追加

// リーグ一覧取得
export async function getLeaguesByUserId(userId: string) {
  const leagues = await leaguesRepo.findLeaguesByUserId(userId)
  return { leagues }
}
```

### 7-3: ルートに追加

`src/server/routes/leagues.ts` の `app.post()` の下に追加：

```typescript
// GET /api/leagues - リーグ一覧
app.get('/', async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})
```

### 7-4: 動作確認

```bash
curl http://localhost:3000/api/leagues \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**期待される結果**:
```json
{
  "leagues": [
    {
      "id": "...",
      "name": "テストリーグ",
      "description": "動作確認用",
      "status": "active",
      "createdBy": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

## タスク8: リーグ詳細取得の追加

### 実装するエンドポイント

**GET /api/leagues/:id** - リーグ詳細（プレイヤー情報含む）

### 8-1: リポジトリに関数追加

```typescript
// findLeaguesByUserId の下に追加

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
```

### 8-2: エラークラスの追加

`src/server/middleware/error-handler.ts` に追加（まだなければ）：

```typescript
export class NotFoundError extends HTTPException {
  constructor(message = 'リソースが見つかりません') {
    super(404, { message })
  }
}

export class ForbiddenError extends HTTPException {
  constructor(message = '権限がありません') {
    super(403, { message })
  }
}
```

### 8-3: サービスに関数追加

```typescript
import { NotFoundError, ForbiddenError } from '../middleware/error-handler'

// getLeaguesByUserId の下に追加

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
```

### 8-4: ルートに追加

```typescript
// GET /api/leagues/:id - リーグ詳細
app.get('/:id', async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')

  const league = await leaguesService.getLeagueById(leagueId, userId)

  return c.json(league, 200)
})
```

### 8-5: 動作確認

```bash
# リーグIDを取得（タスク7で取得したID）
curl http://localhost:3000/api/leagues/{LEAGUE_ID} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## タスク9: リーグ更新の追加

### 実装するエンドポイント

**PATCH /api/leagues/:id** - リーグ情報更新（管理者のみ）

### 9-1: バリデータ追加

`src/server/validators/leagues.ts` に追加：

```typescript
// createLeagueSchema の下に追加

// リーグ更新リクエストのバリデーション
export const updateLeagueSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  description: z.string().optional(),
})
```

### 9-2: リポジトリに関数追加

```typescript
// findLeagueById の下に追加

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
```

### 9-3: サービスに関数追加

```typescript
// getLeagueById の下に追加

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

// ファイルの最後に追加
// Admin権限チェックヘルパー
function hasAdminRole(
  league: { players: Array<{ userId: string | null; role: string | null }> },
  userId: string
): boolean {
  return league.players.some((player) => player.userId === userId && player.role === 'admin')
}
```

### 9-4: ルートに追加

```typescript
import { updateLeagueSchema } from '../validators/leagues'

// PATCH /api/leagues/:id - リーグ更新
app.patch('/:id', zValidator('json', updateLeagueSchema), async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const data = c.req.valid('json')

  const league = await leaguesService.updateLeague(leagueId, userId, data)

  return c.json(league, 200)
})
```

### 9-5: 動作確認

```bash
curl -X PATCH http://localhost:3000/api/leagues/{LEAGUE_ID} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新されたリーグ名"
  }'
```

---

## タスク10: リーグ削除の追加

### 実装するエンドポイント

**DELETE /api/leagues/:id** - リーグ削除（論理削除、管理者のみ）

### 10-1: リポジトリに関数追加

```typescript
// updateLeague の下に追加

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
```

### 10-2: サービスに関数追加

```typescript
// updateLeague の下に追加

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
```

### 10-3: ルートに追加

```typescript
// DELETE /api/leagues/:id - リーグ削除
app.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')

  await leaguesService.deleteLeague(leagueId, userId)

  return c.body(null, 204)
})
```

### 10-4: 動作確認

```bash
curl -X DELETE http://localhost:3000/api/leagues/{LEAGUE_ID} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## タスク11: ステータス変更の追加

### 実装するエンドポイント

**PATCH /api/leagues/:id/status** - ステータス変更（管理者のみ）

### 11-1: バリデータ追加

```typescript
// updateLeagueSchema の下に追加

// ステータス変更リクエストのバリデーション
export const updateLeagueStatusSchema = z.object({
  status: z.enum(['active', 'completed', 'deleted']),
})
```

### 11-2: リポジトリに関数追加

```typescript
// deleteLeague の下に追加

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

### 11-3: サービスに関数追加

```typescript
// deleteLeague の下に追加

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
```

### 11-4: ルートに追加

```typescript
import { updateLeagueStatusSchema } from '../validators/leagues'

// PATCH /api/leagues/:id/status - ステータス変更
app.patch('/:id/status', zValidator('json', updateLeagueStatusSchema), async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const { status } = c.req.valid('json')

  const league = await leaguesService.updateLeagueStatus(leagueId, userId, status)

  return c.json(league, 200)
})
```

### 11-5: 動作確認

```bash
curl -X PATCH http://localhost:3000/api/leagues/{LEAGUE_ID}/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

---

## ステップ2完了チェックリスト

### フェーズ1（必須）
- [ ] リーグ作成APIが実装された
- [ ] curlで動作確認ができた
- [ ] Drizzle Studioでデータを確認できた

### フェーズ2（拡張）
- [ ] リーグ一覧取得が実装された
- [ ] リーグ詳細取得が実装された
- [ ] リーグ更新が実装された
- [ ] リーグ削除が実装された
- [ ] ステータス変更が実装された
- [ ] すべてのエンドポイントの動作確認ができた

### 品質チェック
- [ ] 型エラーがなく、`bun run lint` が通る
- [ ] `bun run build` が成功する

---

## 次のステップへ

ステップ2が完了したら、次はステップ3に進みます：

**ステップ3: プレイヤー管理API**
- プレイヤー名更新
- 権限変更

**ステップ4: フロントエンド統合**
- RPCクライアント初期化（`src/client/api.ts`）
- React Query Hooks作成（`src/client/hooks/useLeagues.ts`）

---

**作成日:** 2025-11-12
