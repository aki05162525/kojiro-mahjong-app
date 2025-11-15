# Issue #30: Zod OpenAPI + Swagger UI 導入

## ステータス

🟡 **Planning**

## 優先度

🔵 **Medium**

## 概要

既存の Hono RPC API に、Zod OpenAPI + Swagger UI を導入し、自動的に API ドキュメントを生成できるようにする。これにより、外部クライアント（モバイルアプリ等）への対応や、開発者体験の向上を実現する。

**重要:** Hono RPC と OpenAPI は共存可能なため、既存の RPC 実装を維持しつつ段階的に移行できる。

---

## 目的

1. **自動 API ドキュメント生成** - コードから OpenAPI 仕様書を自動生成
2. **インタラクティブな API テスト** - Swagger UI でブラウザ上で API をテスト
3. **外部連携の準備** - OpenAPI 仕様書を利用して SDK 生成やモバイルアプリ開発に対応
4. **開発者体験向上** - API の仕様が常に最新でドキュメント化される

---

## 技術スタック

- **@hono/zod-openapi** - Zod スキーマから自動的に OpenAPI 仕様書を生成
- **@hono/swagger-ui** - Swagger UI を Hono アプリに統合
- **Zod** - 既存のバリデーションライブラリ（導入済み）
- **Hono** - 既存の Web フレームワーク（導入済み）

---

## 実装方針

### アーキテクチャ: 2 つの Hono アプリを並走させる

- **RPC アプリ (`src/server/routes/**`)**  
  - `Hono` と `@hono/zod-validator` を使用  
  - React Query などのフロントエンドから型安全に呼ばれる  
  - `AppType` をエクスポートし、`hc<AppType>` でクライアントを生成
- **OpenAPI アプリ (`src/server/openapi/**`)**  
  - `OpenAPIHono` と `@hono/zod-openapi` を使用  
  - Swagger UI や外部クライアント向け  
  - `/api/doc`, `/api/ui`, `/api/leagues` (OpenAPI 実装) などを提供

両アプリは Next.js API ルート (`app/api/[...route]/route.ts`) で同一の `Hono` インスタンスにマウントし、**RPC → OpenAPI** の順で登録する。これにより、既存の RPC 契約を壊さずに OpenAPI を追加でき、同じサービス・リポジトリ層を共有できる。

### フェーズ 1: 基盤構築

1. パッケージインストール
2. `src/server/openapi/index.ts` を作成し、`/api/doc` と `/api/ui` を提供
3. Next.js API ルートで RPC アプリと OpenAPI アプリをマウント

### フェーズ 2: エンドポイント移行

4. `src/server/openapi/routes/leagues.ts` を実装し、リーグ系エンドポイントを OpenAPI 化
5. `src/server/openapi/schemas/**` に Zod OpenAPI スキーマを配置
6. 共通ミドルウェア・サービスを再利用して動作確認

### フェーズ 3: 拡張

7. プレイヤー API など残りのエンドポイントを OpenAPI で実装
8. タグ、レスポンス例、エラーフォーマットを整備
9. Swagger UI カスタマイズや SDK 生成を検討

---

## 実装タスク

### タスク 1: パッケージインストール

```bash
bun add @hono/zod-openapi @hono/swagger-ui
```

**パッケージ詳細:**

- `@hono/zod-openapi` - Zod + OpenAPI 統合
- `@hono/swagger-ui` - Swagger UI 統合

---

### タスク 2: OpenAPI アプリのエントリーポイント追加

#### ファイル: `src/server/openapi/index.ts`

```typescript
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { errorHandler } from '../middleware/error-handler'
import leaguesOpenAPIRoutes from './routes/leagues'

const app = new OpenAPIHono().basePath('/api')

app.onError(errorHandler)

app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Supabase Auth JWT token',
})

app.route('/leagues', leaguesOpenAPIRoutes)

app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Kojiro Mahjong API',
    description: 'Mahjong league management application API',
  },
})

app.get('/ui', swaggerUI({ url: '/api/doc' }))

export default app
```

**ポイント:**

- RPC 用エントリーポイント（`src/server/routes/index.ts`）には手を入れない
- OpenAPI 固有のコードは `src/server/openapi/**` に閉じ込める
- `/api/doc` と `/api/ui` は OpenAPI アプリから提供する

---

### タスク 3: OpenAPI 仕様書エンドポイント追加

#### ファイル: `app/api/[...route]/route.ts`

```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import openapiApp from '@/src/server/openapi'
import rpcApp from '@/src/server/routes'

const app = new Hono()

// ★ ルート解決は登録順なので RPC → OpenAPI の順でマウント
app.route('/', rpcApp)
app.route('/', openapiApp)

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

**ポイント:**

- RPC ルートを先に登録して既存クライアントの挙動を維持
- OpenAPI 専用ルート（`/api/doc`, `/api/ui`）は RPC 側に存在しないため自然に OpenAPI アプリへフォールスルー
- `AppType` は `src/server/routes/index.ts` からエクスポートし続け、RPC クライアントのみを型安全に保つ

---

### タスク 4: サンプルルートの OpenAPI 対応

#### ファイル: `src/server/openapi/routes/leagues.ts`

```typescript
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AuthContext } from '../../middleware/auth'
import { authMiddleware } from '../../middleware/auth'
import * as leaguesService from '../../services/leagues'
import { LeaguesResponseSchema } from '../schemas/leagues'
import { UnauthorizedResponse } from '../schemas/common'

const app = new OpenAPIHono<AuthContext>()

app.use('*', authMiddleware)

const getLeaguesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['leagues'],
  summary: 'Get leagues list',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeaguesResponseSchema,
        },
      },
      description: 'Leagues the user participates in',
    },
    401: UnauthorizedResponse,
  },
})

app.openapi(getLeaguesRoute, async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})

export default app
```

**ポイント:**

- RPC 実装とは別のファイルに OpenAPI 実装を配置
- ミドルウェア、サービス、リポジトリは両アプリで共有
- `createRoute` でスキーマ付きの定義を行い、`app.openapi` で実装
- リクエスト／レスポンススキーマは `src/server/openapi/schemas/**` から import する

---

### タスク 5: バリデーションスキーマの再利用

`src/server/validators/**` では引き続き `zod` を使用し、RPC バリデーションを維持する。一方、OpenAPI 専用のスキーマは `@hono/zod-openapi` を使って `src/server/openapi/schemas/**` に配置する。

#### ファイル: `src/server/openapi/schemas/leagues.ts`

```typescript
import { z } from '@hono/zod-openapi'

export const LeagueSchema = z
  .object({
    id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    name: z.string().min(1).max(20).openapi({ example: '2025 Spring League' }),
    description: z.string().nullable().openapi({ example: 'Every Friday evening' }),
    status: z.enum(['active', 'completed', 'deleted']).openapi({ example: 'active' }),
    createdBy: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    players: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(20),
        role: z.enum(['admin', 'member']),
      })
    ),
  })
  .openapi('League')

export const LeaguesResponseSchema = z
  .object({
    leagues: z.array(LeagueSchema),
  })
  .openapi('LeaguesResponse')
```

**ポイント:**

- OpenAPI スキーマは `.openapi()` メタデータを持つ別ファイル
- RPC バリデーターを壊さずにドキュメント専用の型を提供できる
- `schemas/common.ts` などで `UnauthorizedResponse` などを定義するとルートから再利用しやすい

---

## 段階的移行プラン

### ステップ 1: インフラ準備（必須）

- [ ] パッケージインストール
- [ ] `src/server/openapi/index.ts` の作成
- [ ] OpenAPI 仕様書エンドポイント（`/api/doc`）
- [ ] Swagger UI エンドポイント（`/api/ui`）
- [ ] Next.js API ルートでのマウント順序（RPC → OpenAPI）
- [ ] セキュリティスキーム登録

### ステップ 2: 動作確認（1 エンドポイントのみ）

- [ ] `GET /api/leagues` を OpenAPI 対応に変換
- [ ] Swagger UI でテスト
- [ ] Hono RPC との共存確認

### ステップ 3: リーグ API 移行

- [ ] `POST /api/leagues` - リーグ作成
- [ ] `GET /api/leagues/:id` - リーグ詳細
- [ ] `PATCH /api/leagues/:id` - リーグ更新
- [ ] `DELETE /api/leagues/:id` - リーグ削除
- [ ] `PATCH /api/leagues/:id/status` - ステータス変更

### ステップ 4: プレイヤー API 移行

- [ ] `PATCH /api/leagues/:id/players/:playerId` - プレイヤー名更新
- [ ] `PATCH /api/leagues/:id/players/:playerId/role` - 権限変更

### ステップ 5: ドキュメント整理

- [ ] タグの整理（`leagues`, `players`, `authentication`）
- [ ] レスポンス例の追加
- [ ] エラーレスポンスの統一

---

## 既存実装との互換性

### Hono RPC との共存

**重要:** OpenAPI 対応ルートと Hono RPC は共存できます。

```typescript
// src/server/routes/index.ts
const rpcApp = new Hono().basePath('/api')
const routes = rpcApp
  .route('/leagues', leaguesRoutes)
  .route('/players', playersRoutes)

export type AppType = typeof routes
export default routes

// app/api/[...route]/route.ts
const handlerApp = new Hono()
handlerApp.route('/', rpcApp)   // RPC first
handlerApp.route('/', openapiApp) // OpenAPI second
```

### 段階的移行の利点

1. **リスク最小化** - 1 エンドポイントずつ移行できる
2. **既存機能の維持** - Hono RPC クライアントは引き続き動作
3. **柔軟性** - 移行を途中で中断しても問題なし

---

## テスト方法

### 1. OpenAPI 仕様書の確認

```bash
curl http://localhost:3000/api/doc | jq
```

### 2. Swagger UI でインタラクティブテスト

1. ブラウザで `http://localhost:3000/api/ui` を開く
2. 「Authorize」ボタンをクリックしてトークンを入力
3. 各エンドポイントを展開して「Try it out」をクリック
4. パラメータを入力して「Execute」

### 3. Hono RPC クライアントの動作確認

```typescript
import { apiClient } from "@/src/client/api";

// OpenAPI対応後もHono RPCは引き続き動作
const res = await apiClient.api.leagues.$get();
const data = await res.json(); // 型推論が効く
```

---

## 期待される効果

### 開発者体験の向上

- ✅ Swagger UI でブラウザ上で API をテスト可能
- ✅ API ドキュメントが常に最新に保たれる
- ✅ フロントエンド開発者が API の仕様を確認しやすい

### 外部連携の準備

- ✅ OpenAPI 仕様書を利用して SDK を自動生成
- ✅ モバイルアプリ開発時に API 仕様を共有
- ✅ サードパーティ連携が容易になる

### 品質向上

- ✅ リクエスト/レスポンスのバリデーションが強化される
- ✅ API の仕様が明確になり、バグが減少
- ✅ テストが容易になる

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

## 注意事項

### 必須の変更点

1. **ディレクトリ分離を徹底**  
   - RPC: `src/server/routes/**` + `zod` バリデーター  
   - OpenAPI: `src/server/openapi/**` + `@hono/zod-openapi`

2. **`AppType` は RPC ルートからのみ生成**  
   - OpenAPI 用エンドポイント（`/api/doc`, `/api/ui`）を RPC 型に含めない

3. **Next.js API ルートでは RPC → OpenAPI の順番で `app.route('/', ...)`**  
   - ルーティング解決順を間違えると Swagger UI が到達しなくなる

4. **同じパスを重複定義しない**  
   - RPC と OpenAPI のリクエストスキーマは一致させる  
   - 可能であれば OpenAPI ルートから RPC ルートと同じサービス関数を呼び出し、応答の整合性を保つ

### よくある問題

1. **Content-Type エラー**

   - JSON バリデーションには `Content-Type: application/json` が必須
   - フロントエンドで必ずヘッダーを設定する

2. **Authorization ヘッダー**

   - HTTP ヘッダーは大文字小文字を区別しません（RFC 7230）
   - 既存実装どおり `Authorization: Bearer <token>` で送信すれば OK
   - `c.req.header('Authorization')` で取得可能（既存の認証ミドルウェアと同じ）

3. **型推論が効かない**
   - RPC ルートで誤って `OpenAPIHono` や `@hono/zod-openapi` を使っていないか確認
   - `src/server/routes/index.ts` から `AppType` をエクスポートし、フロント側では `hc<AppType>` だけを参照する

---

## 次のステップ

この Issue が完了したら、以下の拡張を検討できます：

1. **Scalar への移行** - より美しい API ドキュメント UI
2. **SDK 自動生成** - OpenAPI 仕様書からクライアント SDK を生成
3. **API versioning** - `/api/v1`, `/api/v2` のようなバージョニング
4. **モバイルアプリ開発** - OpenAPI 仕様書を利用してネイティブアプリ開発

---

**作成日:** 2025-11-14
