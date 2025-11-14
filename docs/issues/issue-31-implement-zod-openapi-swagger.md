# Issue #31: Zod OpenAPI + Swagger UI 導入

## ステータス
🟡 **Planning**

## 優先度
🔵 **Medium**

## 概要

既存のHono RPC APIに、Zod OpenAPI + Swagger UIを導入し、自動的にAPIドキュメントを生成できるようにする。これにより、外部クライアント（モバイルアプリ等）への対応や、開発者体験の向上を実現する。

**重要:** Hono RPCとOpenAPIは共存可能なため、既存のRPC実装を維持しつつ段階的に移行できる。

---

## 目的

1. **自動APIドキュメント生成** - コードからOpenAPI仕様書を自動生成
2. **インタラクティブなAPIテスト** - Swagger UIでブラウザ上でAPIをテスト
3. **外部連携の準備** - OpenAPI仕様書を利用してSDK生成やモバイルアプリ開発に対応
4. **開発者体験向上** - APIの仕様が常に最新でドキュメント化される

---

## 技術スタック

- **@hono/zod-openapi** - Zodスキーマから自動的にOpenAPI仕様書を生成
- **@hono/swagger-ui** - Swagger UIをHonoアプリに統合
- **Zod** - 既存のバリデーションライブラリ（導入済み）
- **Hono** - 既存のWebフレームワーク（導入済み）

---

## 実装方針

### フェーズ1: 最小構成で導入
1. パッケージインストール
2. OpenAPI仕様書エンドポイント追加（`/api/doc`）
3. Swagger UIエンドポイント追加（`/api/ui`）
4. 1つのエンドポイントだけOpenAPI対応に変換（動作確認）

### フェーズ2: 段階的移行
5. 既存のリーグAPIをOpenAPI対応に移行
6. プレイヤーAPIをOpenAPI対応に移行
7. 認証フローの統合（Bearer Token対応）

### フェーズ3: 完全統合
8. すべてのエンドポイントをOpenAPI対応に変換
9. タグやカテゴリの整理
10. Swagger UIのカスタマイズ

---

## 実装タスク

### タスク1: パッケージインストール

```bash
bun add @hono/zod-openapi @hono/swagger-ui
```

**パッケージ詳細:**
- `@hono/zod-openapi` - Zod + OpenAPI統合
- `@hono/swagger-ui` - Swagger UI統合

---

### タスク2: OpenAPIHonoへの移行

#### ファイル: `src/server/routes/index.ts`

**変更前:**
```typescript
import { Hono } from 'hono'

const app = new Hono().basePath('/api')
```

**変更後:**
```typescript
import { OpenAPIHono } from '@hono/zod-openapi'

const app = new OpenAPIHono().basePath('/api')
```

**ポイント:**
- `Hono` → `OpenAPIHono` に変更
- 既存のルートはそのまま動作する（互換性あり）
- 新しいルートから段階的にOpenAPI対応に移行

---

### タスク3: OpenAPI仕様書エンドポイント追加

#### ファイル: `src/server/routes/index.ts`

```typescript
import { OpenAPIHono } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

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

// --- RPC用のルートを定義（ドキュメントエンドポイントと分離） ---
const rpcRoutes = new Hono()
  .route('/leagues', leaguesRoutes)
  .route('/leagues', playersRoutes)

// ★ RPCクライアント用の型をエクスポート（ドキュメントエンドポイントを含まない）
export type AppType = typeof rpcRoutes

// メインアプリにRPCルートを登録
app.route('/', rpcRoutes)

// --- ドキュメント用エンドポイント（RPC型定義から除外） ---
// OpenAPI仕様書エンドポイント
app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Kojiro Mahjong API',
    description: '麻雀リーグ管理アプリケーションのAPI',
  },
})

// Swagger UIエンドポイント
app.get('/ui', swaggerUI({ url: '/api/doc' }))

export default app
```

**アクセス先:**
- OpenAPI JSON: `http://localhost:3000/api/doc`
- Swagger UI: `http://localhost:3000/api/ui`

---

### タスク4: サンプルルートのOpenAPI対応

#### ファイル: `src/server/routes/leagues.ts`（部分的に変更）

既存のルートの1つをOpenAPI対応に変換して動作確認します。

```typescript
import { createRoute, z } from '@hono/zod-openapi'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as leaguesService from '../services/leagues'

const app = new OpenAPIHono<AuthContext>()

// すべてのルートに認証ミドルウェアを適用
app.use('*', authMiddleware)

// 共通スキーマ定義
const ErrorSchema = z.object({
  error: z.string().openapi({ example: 'UnauthorizedError' }),
  message: z.string().openapi({ example: '認証が必要です' }),
  statusCode: z.number().openapi({ example: 401 }),
}).openapi('Error')

const LeagueSchema = z.object({
  id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
  name: z.string().openapi({ example: '2025年春リーグ' }),
  description: z.string().nullable().openapi({ example: '毎週金曜日開催' }),
  status: z.enum(['active', 'completed', 'deleted']).openapi({ example: 'active' }),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).openapi('League')

const LeaguesResponseSchema = z.object({
  leagues: z.array(LeagueSchema),
}).openapi('LeaguesResponse')

// OpenAPI対応ルート定義
const getLeaguesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['leagues'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeaguesResponseSchema,
        },
      },
      description: 'ユーザーが参加しているリーグ一覧を取得',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema, // 共通エラースキーマを再利用
        },
      },
      description: '認証エラー',
    },
  },
})

// ルート実装
app.openapi(getLeaguesRoute, async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})

// 既存のルートもそのまま維持（段階的移行のため）
// app.post('/', ...)
// app.get('/:id', ...)
// ...

export default app
```

**ポイント:**
- `createRoute` でルート定義
- `app.openapi()` でルート実装
- Zodスキーマに `.openapi()` を使ってメタデータを追加
- 共通の `ErrorSchema` を定義して、すべてのエラーレスポンスで再利用
- 既存のルート（`app.get()`, `app.post()` 等）と共存可能

**ルーティング設計について:**
現在、playersRoutes は `/leagues` パスにマウントされています。これは既存の設計であり、OpenAPI導入時もこの構造を維持します。ルーティング構造の変更は別のissueとして扱います。

**AppType型定義の重要性:**
- `AppType` は `rpcRoutes` から生成されます（ドキュメントエンドポイントを含まない）
- これにより、RPCクライアントに不要なエンドポイント（`/doc`, `/ui`）が公開されるのを防ぎます
- 関心事の明確な分離：RPC用ルート vs ドキュメント用ルート

---

### タスク5: バリデーションスキーマの再利用

既存の `src/server/validators/leagues.ts` のZodスキーマを再利用できます。

**変更前:**
```typescript
import { z } from 'zod'
```

**変更後:**
```typescript
import { z } from '@hono/zod-openapi'
```

これにより、既存のバリデーションスキーマに `.openapi()` メソッドを追加するだけでOpenAPI対応できます。

---

## 段階的移行プラン

### ステップ1: インフラ準備（必須）
- [ ] パッケージインストール
- [ ] `OpenAPIHono` への移行
- [ ] OpenAPI仕様書エンドポイント（`/api/doc`）
- [ ] Swagger UIエンドポイント（`/api/ui`）
- [ ] セキュリティスキーム登録

### ステップ2: 動作確認（1エンドポイントのみ）
- [ ] `GET /api/leagues` をOpenAPI対応に変換
- [ ] Swagger UIでテスト
- [ ] Hono RPCとの共存確認

### ステップ3: リーグAPI移行
- [ ] `POST /api/leagues` - リーグ作成
- [ ] `GET /api/leagues/:id` - リーグ詳細
- [ ] `PATCH /api/leagues/:id` - リーグ更新
- [ ] `DELETE /api/leagues/:id` - リーグ削除
- [ ] `PATCH /api/leagues/:id/status` - ステータス変更

### ステップ4: プレイヤーAPI移行
- [ ] `PATCH /api/leagues/:id/players/:playerId` - プレイヤー名更新
- [ ] `PATCH /api/leagues/:id/players/:playerId/role` - 権限変更

### ステップ5: ドキュメント整理
- [ ] タグの整理（`leagues`, `players`, `authentication`）
- [ ] レスポンス例の追加
- [ ] エラーレスポンスの統一

---

## 既存実装との互換性

### Hono RPCとの共存

**重要:** OpenAPI対応ルートとHono RPCは共存できます。

```typescript
const app = new OpenAPIHono().basePath('/api')

// OpenAPI対応ルート
app.openapi(getLeaguesRoute, handler)

// 従来のHono RPCルート（そのまま動作）
app.get('/legacy', (c) => c.json({ message: 'OK' }))

// 型エクスポート（Hono RPC用）
export type AppType = typeof app  // ← 引き続き型推論が機能
```

### 段階的移行の利点

1. **リスク最小化** - 1エンドポイントずつ移行できる
2. **既存機能の維持** - Hono RPCクライアントは引き続き動作
3. **柔軟性** - 移行を途中で中断しても問題なし

---

## テスト方法

### 1. OpenAPI仕様書の確認
```bash
curl http://localhost:3000/api/doc | jq
```

### 2. Swagger UIでインタラクティブテスト
1. ブラウザで `http://localhost:3000/api/ui` を開く
2. 「Authorize」ボタンをクリックしてトークンを入力
3. 各エンドポイントを展開して「Try it out」をクリック
4. パラメータを入力して「Execute」

### 3. Hono RPCクライアントの動作確認
```typescript
import { apiClient } from '@/src/client/api'

// OpenAPI対応後もHono RPCは引き続き動作
const res = await apiClient.api.leagues.$get()
const data = await res.json()  // 型推論が効く
```

---

## 期待される効果

### 開発者体験の向上
- ✅ Swagger UIでブラウザ上でAPIをテスト可能
- ✅ APIドキュメントが常に最新に保たれる
- ✅ フロントエンド開発者がAPIの仕様を確認しやすい

### 外部連携の準備
- ✅ OpenAPI仕様書を利用してSDKを自動生成
- ✅ モバイルアプリ開発時にAPI仕様を共有
- ✅ サードパーティ連携が容易になる

### 品質向上
- ✅ リクエスト/レスポンスのバリデーションが強化される
- ✅ APIの仕様が明確になり、バグが減少
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

1. **Zodのインポート元を変更**
   ```typescript
   // 変更前
   import { z } from 'zod'

   // 変更後
   import { z } from '@hono/zod-openapi'
   ```

2. **Honoクラスの変更**
   ```typescript
   // 変更前
   import { Hono } from 'hono'
   const app = new Hono()

   // 変更後
   import { OpenAPIHono } from '@hono/zod-openapi'
   const app = new OpenAPIHono()
   ```

3. **ルート登録メソッドの変更**
   ```typescript
   // 変更前
   app.get('/path', handler)

   // 変更後（OpenAPI対応）
   app.openapi(route, handler)
   ```

### よくある問題

1. **Content-Typeエラー**
   - JSONバリデーションには `Content-Type: application/json` が必須
   - フロントエンドで必ずヘッダーを設定する

2. **Authorizationヘッダー**
   - HTTPヘッダーは大文字小文字を区別しません（RFC 7230）
   - 既存実装どおり `Authorization: Bearer <token>` で送信すればOK
   - `c.req.header('Authorization')` で取得可能（既存の認証ミドルウェアと同じ）

3. **型推論が効かない**
   - `z` を `@hono/zod-openapi` からインポートしているか確認
   - `AppType` のエクスポートが正しいか確認

---

## 次のステップ

このIssueが完了したら、以下の拡張を検討できます：

1. **Scalarへの移行** - より美しいAPIドキュメントUI
2. **SDK自動生成** - OpenAPI仕様書からクライアントSDKを生成
3. **API versioning** - `/api/v1`, `/api/v2` のようなバージョニング
4. **モバイルアプリ開発** - OpenAPI仕様書を利用してネイティブアプリ開発

---

**作成日:** 2025-11-14
