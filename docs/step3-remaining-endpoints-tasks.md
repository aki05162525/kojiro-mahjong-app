# ステップ3: プレイヤー管理エンドポイント - 実装タスク

ステップ2でリーグ作成API、およびリーグ管理の全エンドポイントを実装しました。このステップでは、プレイヤー管理の2つのエンドポイントを実装します。

**既に実装済み（確認のみ）:**
- ✅ リーグ作成 (POST /api/leagues)
- ✅ リーグ一覧取得 (GET /api/leagues)
- ✅ リーグ詳細取得 (GET /api/leagues/:id)
- ✅ リーグ更新 (PATCH /api/leagues/:id)
- ✅ リーグ削除 (DELETE /api/leagues/:id)
- ✅ ステータス変更 (PATCH /api/leagues/:id/status)

**このステップで実装:**
- プレイヤー名更新 (PATCH /api/leagues/:id/players/:playerId)
- プレイヤー権限変更 (PATCH /api/leagues/:id/players/:playerId/role)

---

## 既に実装済みのエンドポイント確認

リーグ管理の5つのエンドポイントは既に実装済みです。以下のファイルで確認できます：

- `src/server/routes/leagues.ts` - 全ルート定義
- `src/server/services/leagues.ts` - ビジネスロジック層
- `src/server/repositories/leagues.ts` - データアクセス層
- `src/server/validators/leagues.ts` - バリデーション定義

### 実装済みの機能

1. **GET /api/leagues** - リーグ一覧取得（src/server/routes/leagues.ts:28-32）
2. **GET /api/leagues/:id** - リーグ詳細取得（src/server/routes/leagues.ts:35-42）
3. **PATCH /api/leagues/:id** - リーグ更新（src/server/routes/leagues.ts:45-53）
4. **DELETE /api/leagues/:id** - リーグ削除（src/server/routes/leagues.ts:56-63）
5. **PATCH /api/leagues/:id/status** - ステータス変更（src/server/routes/leagues.ts:66-74）

### テスト方法

```bash
# 開発サーバー起動
bun run dev

# リーグ一覧取得
curl -X GET "http://localhost:3000/api/leagues" \
  -H "Authorization: Bearer $JWT_TOKEN"

# リーグ詳細取得
curl -X GET "http://localhost:3000/api/leagues/{league-id}" \
  -H "Authorization: Bearer $JWT_TOKEN"

# リーグ更新
curl -X PATCH "http://localhost:3000/api/leagues/{league-id}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"新しいリーグ名"}'

# リーグ削除
curl -X DELETE "http://localhost:3000/api/leagues/{league-id}" \
  -H "Authorization: Bearer $JWT_TOKEN"

# ステータス変更
curl -X PATCH "http://localhost:3000/api/leagues/{league-id}/status" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

---

## タスク1: プレイヤー名更新 (PATCH /api/leagues/:id/players/:playerId)

このタスクでは、プレイヤーの名前を更新する機能を実装します。管理者権限が必要です。

### ステップ1-1: バリデータの追加

**ファイル:** `src/server/validators/leagues.ts`

既存のファイルに以下を**追加**します：

```typescript
// プレイヤーID用のパラメータバリデータ
export const playerParamSchema = z.object({
  id: z.string().uuid(),
  playerId: z.string().uuid(),
})

// プレイヤー名更新用のバリデータ
export const updatePlayerNameSchema = z.object({
  name: z.string().min(1, 'プレイヤー名は必須です').max(20, 'プレイヤー名は20文字以内で入力してください'),
})

// プレイヤー権限変更用のバリデータ
export const updatePlayerRoleSchema = z.object({
  role: z.enum(['admin', 'scorer', 'viewer']).nullable(),
})
```

### ステップ1-2: プレイヤーリポジトリの作成

**ファイル:** `src/server/repositories/players.ts`（**新規作成**）

関数ベースのリポジトリを作成します：

```typescript
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { playersTable } from '@/db/schema'

// プレイヤー名を更新
export async function updatePlayerName(
  leagueId: string,
  playerId: string,
  name: string,
) {
  const [player] = await db
    .update(playersTable)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(and(eq(playersTable.id, playerId), eq(playersTable.leagueId, leagueId)))
    .returning()

  return player
}

// プレイヤー権限を更新
export async function updatePlayerRole(
  leagueId: string,
  playerId: string,
  role: 'admin' | 'scorer' | 'viewer' | null,
) {
  const [player] = await db
    .update(playersTable)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(and(eq(playersTable.id, playerId), eq(playersTable.leagueId, leagueId)))
    .returning()

  return player
}

// プレイヤーを取得（権限チェック用）
export async function findPlayerById(leagueId: string, playerId: string) {
  return await db.query.playersTable.findFirst({
    where: and(eq(playersTable.id, playerId), eq(playersTable.leagueId, leagueId)),
  })
}
```

### ステップ1-3: プレイヤーサービスの作成

**ファイル:** `src/server/services/players.ts`（**新規作成**）

関数ベースのサービス層を作成します：

```typescript
import { ForbiddenError, NotFoundError } from '../middleware/error-handler'
import * as playersRepo from '../repositories/players'
import * as leaguesRepo from '../repositories/leagues'

// プレイヤー名更新
export async function updatePlayerName(
  leagueId: string,
  playerId: string,
  userId: string,
  name: string,
) {
  await verifyAdminRole(leagueId, userId)
  const player = await playersRepo.updatePlayerName(leagueId, playerId, name)

  if (!player) {
    throw new NotFoundError('プレイヤーが見つかりません')
  }

  return player
}

// プレイヤー権限変更
export async function updatePlayerRole(
  leagueId: string,
  playerId: string,
  userId: string,
  role: 'admin' | 'scorer' | 'viewer' | null,
) {
  await verifyAdminRole(leagueId, userId)

  // プレイヤーがユーザーと紐づいているか確認
  const player = await playersRepo.findPlayerById(leagueId, playerId)

  if (!player) {
    throw new NotFoundError('プレイヤーが見つかりません')
  }

  if (!player.userId && role !== null) {
    throw new ForbiddenError('ユーザーと紐づいていないプレイヤーには権限を付与できません')
  }

  return await playersRepo.updatePlayerRole(leagueId, playerId, role)
}

// 管理者権限チェック
async function verifyAdminRole(leagueId: string, userId: string) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  const hasAdmin = league.players.some(
    (player) => player.userId === userId && player.role === 'admin',
  )

  if (!hasAdmin) {
    throw new ForbiddenError('この操作を実行する権限がありません')
  }
}
```

### ステップ1-4: プレイヤールートの作成

**ファイル:** `src/server/routes/players.ts`（**新規作成**）

```typescript
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as playersService from '../services/players'
import {
  playerParamSchema,
  updatePlayerNameSchema,
  updatePlayerRoleSchema,
} from '../validators/leagues'

const app = new Hono<AuthContext>()

// すべてのルートに認証ミドルウェアを適用
app.use('*', authMiddleware)

// PATCH /api/players/:id/players/:playerId - プレイヤー名更新
app.patch(
  '/:id/players/:playerId',
  zValidator('param', playerParamSchema),
  zValidator('json', updatePlayerNameSchema),
  async (c) => {
    const userId = c.get('userId')
    const { id, playerId } = c.req.valid('param')
    const { name } = c.req.valid('json')

    const player = await playersService.updatePlayerName(id, playerId, userId, name)

    return c.json(player, 200)
  },
)

// PATCH /api/players/:id/players/:playerId/role - プレイヤー権限変更
app.patch(
  '/:id/players/:playerId/role',
  zValidator('param', playerParamSchema),
  zValidator('json', updatePlayerRoleSchema),
  async (c) => {
    const userId = c.get('userId')
    const { id, playerId } = c.req.valid('param')
    const { role } = c.req.valid('json')

    const player = await playersService.updatePlayerRole(id, playerId, userId, role)

    return c.json(player, 200)
  },
)

export default app
```

### ステップ1-5: ルートの統合

**ファイル:** `src/server/routes/index.ts`

既存のファイルを編集して、プレイヤールートを追加します：

```typescript
import { Hono } from 'hono'
import leaguesRoutes from './leagues'
import playersRoutes from './players'  // 追加

const app = new Hono().basePath('/api')

// ★すべてのルートを1つの式でチェーン（型推論に必須）
const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/leagues', playersRoutes)  // 追加

// ★AppTypeをエクスポート（Hono RPCで使用）
export type AppType = typeof routes

export default routes  // app ではなく routes をエクスポート
```

**重要な注意点:**
- `app/api/[...route]/route.ts` の編集は**不要**です
- `src/server/routes/index.ts` でルートを統合します
- `export default app` を `export default routes` に変更します（Hono RPC型推論に必須）

### 実装のポイント

1. **関数ベースのアーキテクチャ**
   - クラスではなく、`export async function` を使用
   - 既存のコードベースと統一されたスタイル

2. **認証ミドルウェア**
   - `c.get('userId')` で認証済みユーザーIDを取得
   - `c.get('user')` ではなく `c.get('userId')` を使用

3. **権限チェック**
   - `verifyAdminRole()` ヘルパーで管理者権限を確認
   - `ForbiddenError` または `NotFoundError` をスロー

4. **エラーハンドリング**
   - エラーはミドルウェアが自動的にキャッチして適切なレスポンスを返す
   - `try-catch` は不要

### テスト方法

```bash
# プレイヤー名を更新
curl -X PATCH "http://localhost:3000/api/leagues/{league-id}/players/{player-id}" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"新しい名前"}'

# 成功レスポンス例
{
  "id": "...",
  "leagueId": "...",
  "name": "新しい名前",
  "userId": "...",
  "role": "admin",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 📚 公式ドキュメント

**Hono:**
- [Multiple Path Parameters - Hono](https://hono.dev/docs/getting-started/basic#path-parameter)
- [Context - Hono](https://hono.dev/docs/api/context)

**Drizzle ORM:**
- [Update with Multiple Conditions - Drizzle ORM](https://orm.drizzle.team/docs/update)
- [Relational Queries - Drizzle ORM](https://orm.drizzle.team/docs/rqb)

**Zod:**
- [String Validation - Zod](https://zod.dev/api#strings)

**重要な注意点:**
- リーグIDとプレイヤーIDの両方をチェック
- 管理者権限必須
- エラーハンドリングはミドルウェアに任せる

---

## タスク2: プレイヤー権限変更 (PATCH /api/leagues/:id/players/:playerId/role)

このタスクは**タスク1で既に実装済み**です。`src/server/routes/players.ts` に含まれています。

### 実装内容の確認

**ファイル:** `src/server/routes/players.ts:30-43`

```typescript
// PATCH /api/players/:id/players/:playerId/role - プレイヤー権限変更
app.patch(
  '/:id/players/:playerId/role',
  zValidator('param', playerParamSchema),
  zValidator('json', updatePlayerRoleSchema),
  async (c) => {
    const userId = c.get('userId')
    const { id, playerId } = c.req.valid('param')
    const { role } = c.req.valid('json')

    const player = await playersService.updatePlayerRole(id, playerId, userId, role)

    return c.json(player, 200)
  },
)
```

### 実装のポイント

1. **権限付与の制約**
   - `userId` が設定されているプレイヤーのみ権限を付与可能
   - `userId` が `null` の場合は `ForbiddenError` をスロー

2. **権限の種類**
   - `admin`: リーグ管理者（全操作可能）
   - `scorer`: スコア入力者（スコア入力のみ可能）
   - `viewer`: 閲覧者（閲覧のみ）
   - `null`: 権限なし

3. **バリデーション**
   - Zodスキーマで `role` を `.nullable()` に設定
   - `'admin' | 'scorer' | 'viewer' | null` を許可

### テスト方法

```bash
# プレイヤーにadmin権限を付与
curl -X PATCH "http://localhost:3000/api/leagues/{league-id}/players/{player-id}/role" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

# 権限を削除（nullに設定）
curl -X PATCH "http://localhost:3000/api/leagues/{league-id}/players/{player-id}/role" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":null}'

# エラーレスポンス例（user_idが未設定の場合）
{
  "error": "Forbidden",
  "message": "ユーザーと紐づいていないプレイヤーには権限を付与できません",
  "statusCode": 403
}
```

### 📚 公式ドキュメント

**Zod:**
- [Nullable Types - Zod](https://zod.dev/api#nullable)
- [Enum Validation - Zod](https://zod.dev/api#enums)

**重要な注意点:**
- `userId` が `null` の場合は権限を付与できない
- 管理者権限必須
- 自分自身の権限を削除することも可能（注意が必要）

---

## ステップ3完了チェックリスト

- [ ] タスク1: プレイヤー名更新が完了
  - [ ] バリデータ追加（`src/server/validators/leagues.ts`）
  - [ ] リポジトリ作成（`src/server/repositories/players.ts`）
  - [ ] サービス作成（`src/server/services/players.ts`）
  - [ ] ルート作成（`src/server/routes/players.ts`）
  - [ ] ルート統合（`app/api/[...route]/route.ts`）
- [ ] タスク2: プレイヤー権限変更が完了（タスク1に含まれる）
- [ ] `bun run lint` が通る
- [ ] 各エンドポイントの動作確認が完了
- [ ] 権限チェックが正しく機能している

---

## 次のステップへ

ステップ3が完了したら、**ステップ4: フロントエンド統合**に進みます。

ステップ4では以下を実装します:
1. RPCクライアント初期化 (`src/client/api.ts`)
2. React Query Hooks作成 (`src/client/hooks/useLeagues.ts`)
3. 型安全なAPIクライアントの使用

---

**作成日:** 2025-11-14
