# Issue #30: Zod OpenAPI + Swagger UI 導入 - 実装タスク

**推奨アプローチ:** 現行構成を維持しつつ、OpenAPI専用サブツリーを追加

このタスクファイルでは、既存の Hono RPC 実装を維持しながら、OpenAPI + Swagger UI を段階的に導入します。

**目標:**
- 既存の `src/server/routes/**` を維持（Hono RPC との互換性）
- OpenAPI 専用のディレクトリ `src/server/openapi/` を追加
- ルート実装とスキーマ/ドキュメント生成を明確に分離
- レビュー範囲を局所化し、既存コードへの影響を最小限に

---

## アーキテクチャ概要

### 現在の構造（維持）

```
src/server/
├── middleware/      # 認証・エラーハンドリング
├── services/        # ビジネスロジック
├── repositories/    # データアクセス
├── validators/      # Zod バリデーション
└── routes/          # Hono RPC ルート定義
    ├── index.ts     # ルート統合・AppType エクスポート
    ├── leagues.ts   # リーグ API
    └── players.ts   # プレイヤー API
```

### 追加する構造（新規）

```
src/server/openapi/
├── schemas/         # OpenAPI スキーマ定義（Zod）
│   ├── common.ts    # 共通スキーマ（Error等）
│   ├── leagues.ts   # リーグスキーマ
│   └── players.ts   # プレイヤースキーマ
├── routes/          # OpenAPI ルート定義
│   ├── leagues.ts   # リーグ OpenAPI ルート
│   └── players.ts   # プレイヤー OpenAPI ルート
└── index.ts         # OpenAPI 統合・仕様書生成
```

### 責務の分離

| ディレクトリ | 責務 | 用途 |
|------------|------|------|
| `src/server/routes/` | Hono RPC エンドポイント | フロントエンド（Hono RPC Client） |
| `src/server/openapi/` | OpenAPI スキーマ・ドキュメント生成 | 外部クライアント・モバイルアプリ・SDK生成 |
| `src/server/services/` | ビジネスロジック（共有） | 両方から呼び出される |

**重要:** サービス層は両方から共有されるため、変更不要です。

---

## 前提条件

- [x] Hono + Drizzle ORM + Zod のセットアップ完了
- [x] 認証ミドルウェア（Supabase Auth）実装済み
- [x] リーグ API の基本実装完了

---

## タスク1: パッケージインストール

### 実装内容

OpenAPI と Swagger UI のサポートに必要なパッケージをインストールします。

```bash
bun add @hono/zod-openapi @hono/swagger-ui
```

### パッケージ詳細

- **`@hono/zod-openapi`** - Zod スキーマから OpenAPI 仕様書を自動生成
- **`@hono/swagger-ui`** - Swagger UI を Hono アプリに統合

### 確認方法

```bash
# package.json に追加されたことを確認
grep -A2 "zod-openapi" package.json
```

---

## タスク2: OpenAPI ディレクトリ構造の作成

### 実装内容

OpenAPI 専用のディレクトリ構造を作成します。

```bash
mkdir -p src/server/openapi/schemas
mkdir -p src/server/openapi/routes
touch src/server/openapi/schemas/common.ts
touch src/server/openapi/schemas/leagues.ts
touch src/server/openapi/routes/leagues.ts
touch src/server/openapi/index.ts
```

### ディレクトリ説明

```
src/server/openapi/
├── schemas/         # Zod スキーマ定義（.openapi() 付き）
│   ├── common.ts    # 共通スキーマ（Error, Pagination等）
│   └── leagues.ts   # リーグ関連スキーマ
├── routes/          # OpenAPI ルート定義（createRoute + app.openapi）
│   └── leagues.ts   # リーグ OpenAPI ルート
└── index.ts         # メインエントリポイント（仕様書生成）
```

---

## タスク3: 共通スキーマの定義

### ファイル: `src/server/openapi/schemas/common.ts`

### 実装内容

すべての API で共有する共通スキーマを定義します。

```typescript
import { z } from '@hono/zod-openapi'

/**
 * 共通エラーレスポンススキーマ
 */
export const ErrorSchema = z
  .object({
    error: z.string().openapi({
      example: 'UnauthorizedError',
      description: 'エラーの種類',
    }),
    message: z.string().openapi({
      example: '認証が必要です',
      description: 'エラーメッセージ',
    }),
    statusCode: z.number().openapi({
      example: 401,
      description: 'HTTPステータスコード',
    }),
  })
  .openapi('Error')

/**
 * 認証エラーレスポンス（再利用可能）
 */
export const UnauthorizedResponse = {
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
  description: '認証エラー',
}

/**
 * 権限不足エラーレスポンス（再利用可能）
 */
export const ForbiddenResponse = {
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
  description: '権限がありません',
}

/**
 * リソースが見つからないエラーレスポンス（再利用可能）
 */
export const NotFoundResponse = {
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
  description: 'リソースが見つかりません',
}
```

### 実装のポイント

1. **`.openapi()` メソッド**
   - Zod スキーマに OpenAPI メタデータを追加
   - `example`, `description` などを指定可能

2. **共通レスポンスの再利用**
   - `UnauthorizedResponse` などを定義しておくことで、各ルートで再利用可能
   - コードの重複を削減し、一貫性を保つ

3. **名前付きスキーマ**
   - `.openapi('Error')` で OpenAPI の Components セクションに登録
   - `#/components/schemas/Error` として参照可能

---

## タスク4: リーグスキーマの定義

### ファイル: `src/server/openapi/schemas/leagues.ts`

### 実装内容

リーグ関連の OpenAPI スキーマを定義します。

```typescript
import { z } from '@hono/zod-openapi'

/**
 * リーグステータス
 */
export const LeagueStatusSchema = z
  .enum(['active', 'completed', 'deleted'])
  .openapi({
    description: 'リーグのステータス',
    example: 'active',
  })

/**
 * リーグオブジェクトスキーマ
 */
export const LeagueSchema = z
  .object({
    id: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174000',
      description: 'リーグID',
    }),
    name: z.string().min(1).max(20).openapi({
      example: '2025年春リーグ',
      description: 'リーグ名（1-20文字）',
    }),
    description: z.string().nullable().openapi({
      example: '毎週金曜日開催',
      description: 'リーグの説明（任意）',
    }),
    status: LeagueStatusSchema,
    createdBy: z.string().uuid().openapi({
      description: '作成者のユーザーID',
    }),
    createdAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: '作成日時',
    }),
    updatedAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: '更新日時',
    }),
  })
  .openapi('League')

/**
 * リーグ一覧レスポンス
 */
export const LeaguesResponseSchema = z
  .object({
    leagues: z.array(LeagueSchema).openapi({
      description: 'ユーザーが参加しているリーグ一覧',
    }),
  })
  .openapi('LeaguesResponse')

/**
 * リーグ作成リクエスト
 */
export const CreateLeagueRequestSchema = z
  .object({
    name: z.string().min(1).max(20).openapi({
      example: '2025年春リーグ',
      description: 'リーグ名（1-20文字）',
    }),
    description: z.string().optional().openapi({
      example: '毎週金曜日開催',
      description: 'リーグの説明（任意）',
    }),
    playerCount: z.enum(['8', '16']).openapi({
      example: '8',
      description: 'プレイヤー数（8人または16人）',
    }),
    playerNames: z.array(z.string().min(1).max(20)).openapi({
      example: ['プレイヤー1', 'プレイヤー2', 'プレイヤー3'],
      description: 'プレイヤー名リスト',
    }),
  })
  .openapi('CreateLeagueRequest')

/**
 * リーグ更新リクエスト
 */
export const UpdateLeagueRequestSchema = z
  .object({
    name: z.string().min(1).max(20).optional().openapi({
      example: '2025年春リーグ（更新版）',
      description: 'リーグ名（1-20文字）',
    }),
    description: z.string().optional().openapi({
      example: '毎週金曜日開催（更新版）',
      description: 'リーグの説明（任意）',
    }),
  })
  .openapi('UpdateLeagueRequest')

/**
 * ステータス変更リクエスト
 */
export const UpdateLeagueStatusRequestSchema = z
  .object({
    status: LeagueStatusSchema,
  })
  .openapi('UpdateLeagueStatusRequest')
```

### 実装のポイント

1. **既存のバリデーションスキーマとの関係**
   - `src/server/validators/leagues.ts` の Zod スキーマをベースにする
   - `.openapi()` メタデータを追加して OpenAPI 対応にする
   - 既存のバリデーションロジックは変更しない

2. **スキーマの再利用**
   - `LeagueStatusSchema` を別途定義し、複数のスキーマで再利用
   - DRY 原則に従い、重複を避ける

3. **詳細な例とドキュメント**
   - `example` を必ず指定（Swagger UI で役立つ）
   - `description` でフィールドの意味を明確化

---

## タスク5: OpenAPI ルートの定義

### ファイル: `src/server/openapi/routes/leagues.ts`

### 実装内容

リーグ API の OpenAPI ルート定義を作成します。

```typescript
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { AuthContext } from '../../middleware/auth'
import { authMiddleware } from '../../middleware/auth'
import * as leaguesService from '../../services/leagues'
import {
  ForbiddenResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from '../schemas/common'
import {
  CreateLeagueRequestSchema,
  LeagueSchema,
  LeaguesResponseSchema,
  UpdateLeagueRequestSchema,
  UpdateLeagueStatusRequestSchema,
} from '../schemas/leagues'

const app = new OpenAPIHono<AuthContext>()

// すべてのルートに認証ミドルウェアを適用
app.use('*', authMiddleware)

/**
 * GET /api/leagues - リーグ一覧取得
 */
const getLeaguesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['leagues'],
  summary: 'リーグ一覧を取得',
  description: 'ユーザーが参加しているリーグ一覧を取得します',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeaguesResponseSchema,
        },
      },
      description: 'リーグ一覧取得成功',
    },
    401: UnauthorizedResponse,
  },
})

app.openapi(getLeaguesRoute, async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})

/**
 * POST /api/leagues - リーグ作成
 */
const createLeagueRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['leagues'],
  summary: 'リーグを作成',
  description: '新しいリーグを作成します。作成者は自動的に admin 権限が付与されます。',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateLeagueRequestSchema,
        },
      },
      description: 'リーグ作成リクエスト',
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: LeagueSchema,
        },
      },
      description: 'リーグ作成成功',
    },
    401: UnauthorizedResponse,
  },
})

app.openapi(createLeagueRoute, async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')
  const league = await leaguesService.createLeague(userId, data)
  return c.json(league, 201)
})

/**
 * GET /api/leagues/:id - リーグ詳細取得
 */
const getLeagueRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['leagues'],
  summary: 'リーグ詳細を取得',
  description: '指定されたIDのリーグ詳細を取得します',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        param: {
          name: 'id',
          in: 'path',
        },
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'リーグID',
      }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeagueSchema,
        },
      },
      description: 'リーグ詳細取得成功',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(getLeagueRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const league = await leaguesService.getLeagueById(leagueId, userId)
  return c.json(league, 200)
})

/**
 * PATCH /api/leagues/:id - リーグ更新
 */
const updateLeagueRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['leagues'],
  summary: 'リーグを更新',
  description: 'リーグの名前や説明を更新します（admin 権限が必要）',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        param: {
          name: 'id',
          in: 'path',
        },
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'リーグID',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateLeagueRequestSchema,
        },
      },
      description: 'リーグ更新リクエスト',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeagueSchema,
        },
      },
      description: 'リーグ更新成功',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(updateLeagueRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const data = c.req.valid('json')
  const league = await leaguesService.updateLeague(leagueId, userId, data)
  return c.json(league, 200)
})

/**
 * DELETE /api/leagues/:id - リーグ削除
 */
const deleteLeagueRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['leagues'],
  summary: 'リーグを削除',
  description: 'リーグを論理削除します（admin 権限が必要）',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        param: {
          name: 'id',
          in: 'path',
        },
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'リーグID',
      }),
    }),
  },
  responses: {
    204: {
      description: 'リーグ削除成功',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(deleteLeagueRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  await leaguesService.deleteLeague(leagueId, userId)
  return c.body(null, 204)
})

/**
 * PATCH /api/leagues/:id/status - ステータス変更
 */
const updateLeagueStatusRoute = createRoute({
  method: 'patch',
  path: '/{id}/status',
  tags: ['leagues'],
  summary: 'リーグステータスを変更',
  description: 'リーグのステータスを変更します（admin 権限が必要）',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().uuid().openapi({
        param: {
          name: 'id',
          in: 'path',
        },
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'リーグID',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateLeagueStatusRequestSchema,
        },
      },
      description: 'ステータス変更リクエスト',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeagueSchema,
        },
      },
      description: 'ステータス変更成功',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(updateLeagueStatusRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const { status } = c.req.valid('json')
  const league = await leaguesService.updateLeagueStatus(leagueId, userId, status)
  return c.json(league, 200)
})

export default app
```

### 実装のポイント

1. **`createRoute` でルート定義**
   - `method`, `path`, `tags`, `summary`, `description` を指定
   - `security` で認証要件を明示
   - `request` でリクエストボディやパラメータのスキーマを定義
   - `responses` で各レスポンスステータスのスキーマを定義

2. **`app.openapi()` でルート実装**
   - 第1引数: `createRoute` で定義したルート
   - 第2引数: ハンドラー関数（既存の実装と同じ）

3. **サービス層の再利用**
   - `leaguesService` を直接呼び出す
   - ビジネスロジックは変更不要

4. **パスパラメータの定義**
   - `request.params` で Zod スキーマを定義
   - `.openapi({ param: { name: 'id', in: 'path' } })` で OpenAPI パラメータとして登録

5. **共通レスポンスの再利用**
   - `UnauthorizedResponse`, `ForbiddenResponse`, `NotFoundResponse` を各ルートで再利用
   - コードの重複を削減

---

## タスク6: OpenAPI メインエントリポイントの作成

### ファイル: `src/server/openapi/index.ts`

### 実装内容

OpenAPI の統合ポイントとなるファイルを作成します。

```typescript
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { errorHandler } from '../middleware/error-handler'
import leaguesOpenAPIRoutes from './routes/leagues'

const app = new OpenAPIHono().basePath('/api')

// エラーハンドラーを登録
app.onError(errorHandler)

// セキュリティスキームを登録
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Supabase AuthのJWTトークンを使用',
})

// OpenAPI ルートを登録
app.route('/leagues', leaguesOpenAPIRoutes)

// OpenAPI 仕様書エンドポイント
app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Kojiro Mahjong API',
    description: '麻雀リーグ管理アプリケーションのAPI',
  },
})

// Swagger UI エンドポイント
app.get('/ui', swaggerUI({ url: '/api/doc' }))

export default app
```

### 実装のポイント

1. **セキュリティスキームの登録**
   - `app.openAPIRegistry.registerComponent` で Bearer 認証を登録
   - すべてのルートで `security: [{ Bearer: [] }]` を使用可能

2. **OpenAPI 仕様書の生成**
   - `app.doc('/doc', {...})` で `/api/doc` に JSON 仕様書を公開
   - `openapi`, `info` などのメタデータを指定

3. **Swagger UI の統合**
   - `swaggerUI({ url: '/api/doc' })` で `/api/ui` に Swagger UI を公開
   - ブラウザでインタラクティブに API をテスト可能

---

## タスク7: Next.js ハンドラーの更新

### ファイル: `app/api/[...route]/route.ts`

### 実装内容

Next.js の API ハンドラーを更新して、OpenAPI アプリをマウントします。

**現在:**
```typescript
import { handle } from 'hono/vercel'
import app from '@/src/server/routes'

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

**更新後:**
```typescript
import { handle } from 'hono/vercel'
import rpcApp from '@/src/server/routes'
import openapiApp from '@/src/server/openapi'
import { Hono } from 'hono'

// メインアプリを作成
const app = new Hono()

// RPC ルートをマウント（既存）
app.route('/', rpcApp)

// OpenAPI ルートをマウント（新規）
app.route('/', openapiApp)

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

### 実装のポイント

1. **両方のアプリをマウント**
   - `rpcApp` (Hono RPC) と `openapiApp` (OpenAPI) の両方を統合
   - 両者は `/api` basePath を共有

2. **パスの競合を回避**
   - OpenAPI の `/api/doc` と `/api/ui` は新しいエンドポイント
   - 既存の `/api/leagues` などのパスは `rpcApp` が優先される（先にマウント）

3. **型安全性の維持**
   - `src/server/routes/index.ts` の `AppType` は引き続き RPC クライアントで使用可能

---

## タスク8: 動作確認

### 開発サーバーの起動

```bash
bun run dev
```

### テスト1: OpenAPI 仕様書の確認

```bash
curl http://localhost:3000/api/doc | jq
```

**期待される出力:**
```json
{
  "openapi": "3.1.0",
  "info": {
    "version": "1.0.0",
    "title": "Kojiro Mahjong API",
    "description": "麻雀リーグ管理アプリケーションのAPI"
  },
  "paths": {
    "/api/leagues": { ... },
    "/api/leagues/{id}": { ... },
    ...
  },
  "components": {
    "schemas": {
      "League": { ... },
      "Error": { ... }
    },
    "securitySchemes": {
      "Bearer": { ... }
    }
  }
}
```

### テスト2: Swagger UI でインタラクティブテスト

1. ブラウザで `http://localhost:3000/api/ui` を開く
2. 「Authorize」ボタンをクリック
3. Supabase の JWT トークンを入力（形式: `Bearer <token>`）
4. `GET /api/leagues` エンドポイントを展開
5. 「Try it out」→「Execute」をクリック
6. レスポンスが正しく返ることを確認

### テスト3: Hono RPC クライアントの互換性確認

```typescript
import { apiClient } from '@/src/client/api'

// Hono RPC は引き続き動作する
const res = await apiClient.api.leagues.$get()
const data = await res.json() // 型推論が効く
```

### テスト4: TypeScript ビルドの確認

```bash
bun run build
```

**期待される結果:**
- ビルドエラーが発生しないこと
- 型エラーが発生しないこと

---

## 注意事項

### 1. Zod のインポート元

OpenAPI 対応のスキーマでは、`@hono/zod-openapi` から Zod をインポートします。

```typescript
// ❌ 間違い
import { z } from 'zod'

// ✅ 正しい（OpenAPI スキーマ用）
import { z } from '@hono/zod-openapi'
```

### 2. 既存のバリデーションスキーマとの共存

- `src/server/validators/` の既存スキーマは変更不要
- `src/server/openapi/schemas/` に OpenAPI 専用スキーマを新規作成
- 両者は独立しており、共存可能

### 3. パスパラメータの定義

パスパラメータは `request.params` で Zod スキーマを定義し、`.openapi()` でメタデータを追加します。

```typescript
request: {
  params: z.object({
    id: z.string().uuid().openapi({
      param: {
        name: 'id',
        in: 'path',
      },
      example: '123e4567-e89b-12d3-a456-426614174000',
    }),
  }),
}
```

### 4. Content-Type ヘッダー

JSON リクエストには `Content-Type: application/json` が必須です。

```typescript
// フロントエンドで必ずヘッダーを設定
fetch('/api/leagues', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>',
  },
  body: JSON.stringify(data),
})
```

### 5. Deprecation 警告

`.uuid()` や `.datetime()` メソッドに deprecation 警告が表示されることがありますが、動作には影響ありません。将来的に新しい API に移行する必要があります。

---

## 次のステップ

この実装が完了したら、以下の拡張を検討できます：

1. **プレイヤー API の OpenAPI 対応**
   - `src/server/openapi/schemas/players.ts` を追加
   - `src/server/openapi/routes/players.ts` を追加

2. **Scalar への移行**
   - Swagger UI よりも美しい API ドキュメント UI
   - `@scalar/hono-api-reference` を使用

3. **SDK 自動生成**
   - OpenAPI 仕様書から TypeScript/JavaScript SDK を生成
   - `openapi-generator` や `@hey-api/openapi-ts` を使用

4. **API バージョニング**
   - `/api/v1`, `/api/v2` のようなバージョン管理
   - 既存のクライアントとの互換性を維持しつつ新機能を追加

---

## 参考資料

### 公式ドキュメント

- [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [Hono Swagger UI](https://hono.dev/examples/swagger-ui)
- [@hono/zod-openapi - npm](https://www.npmjs.com/package/@hono/zod-openapi)
- [@hono/swagger-ui - npm](https://www.npmjs.com/package/@hono/swagger-ui)

### チュートリアル

- [Integrate Hono with OpenAPI/Swagger](https://dev.to/bimaadi/integrate-hono-with-openapiswagger-3dem)
- [How To Generate an OpenAPI Document With Hono](https://www.speakeasy.com/openapi/frameworks/hono)

---

**作成日:** 2025-01-15
**関連 Issue:** [Issue #30](./issues/issue-30-implement-zod-openapi-swagger.md)
