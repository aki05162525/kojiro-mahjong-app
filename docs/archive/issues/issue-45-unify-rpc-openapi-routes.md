# Issue 45: RPC/OpenAPIルート定義の一本化

## 概要

現在、RPC用とOpenAPI用でルート定義が二重管理されており、保守コストが高い状態にある。
Hono公式が推奨するOpenAPIベースのアプローチに統一し、メンテナンス性を向上させる。

## 現状の問題

### 二重定義の例（leagues）
- `src/server/routes/leagues.ts` (69行) - RPC用
- `src/server/openapi/routes/leagues.ts` (290行) - OpenAPI用
- **同じロジックが2箇所に実装**されており、変更時に両方を更新する必要がある

### 問題点
1. **保守コストが2倍** - 機能追加・修正時に2ファイルの更新が必要
2. **不整合のリスク** - 片方だけ更新し忘れる可能性
3. **コード重複** - DRY原則に反する
4. **テストコスト増** - 同じロジックを2回テストする必要

## 解決策: OpenAPIベースへの統一

### アプローチ

Hono公式が推奨する`@hono/zod-openapi`をベースに、RPC型も同じルート定義から抽出する。

### メリット

1. **型安全性の維持** - Zod OpenAPIから自動的にRPC型も生成可能
2. **ドキュメント自動生成** - Swagger UIが常に最新
3. **保守コスト削減** - 1箇所の変更で済む
4. **コード量削減** - 現在の`290+69=359行`→約`300行`
5. **Hono公式推奨パターン** - 最新のベストプラクティスに準拠

## 実装計画

### 1. ルート統合（OpenAPIベースに変更）

```typescript
// src/server/routes/index.ts (変更後)
import { OpenAPIHono } from '@hono/zod-openapi'
import { errorHandler } from '../middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

const app = new OpenAPIHono().basePath('/api')

// エラーハンドラーを登録
app.onError(errorHandler)

// セキュリティスキーマを登録
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Supabase Auth JWT token',
})

// OpenAPIルートを定義
// ★ playersRoutes は /leagues/:leagueId/players/* のパスを持つため、/leagues でマウント
const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/leagues', playersRoutes)

// OpenAPI仕様エンドポイント
app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Kojiro Mahjong API',
    description: 'Mahjong league management application API',
  },
})

// Swagger UI エンドポイント
app.get('/ui', swaggerUI({ url: '/api/doc' }))

// ★ RPC用の型をエクスポート（フロントエンドで使用）
export type AppType = typeof routes

export default app
```

### 2. 個別ルートファイルの統合

```typescript
// src/server/routes/leagues.ts (変更後)
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as leaguesService from '../services/leagues'
import {
  CreateLeagueRequestSchema,
  LeagueSchema,
  LeaguesResponseSchema,
  // ... その他のスキーマ
} from '../schemas/leagues'  // openapi/schemas から移動

const app = new OpenAPIHono<AuthContext>()

// 認証ミドルウェアを適用
app.use('*', authMiddleware)

// GET /api/leagues
const getLeaguesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['leagues'],
  summary: 'Get leagues list',
  security: [{ Bearer: [] }],
  responses: { /* ... */ },
})

app.openapi(getLeaguesRoute, async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})

// ... その他のエンドポイント定義

export default app
```

### 3. スキーマの統合

**重要: 既存のスキーマをそのまま移動する**

```typescript
// src/server/schemas/ (新規ディレクトリ)
// openapi/schemas/ から既存のスキーマファイルを移動する

// src/server/schemas/leagues.ts
// ★ src/server/openapi/schemas/leagues.ts の内容をそのまま移動
// ★ 以下のスキーマが含まれる（変更不可）:
//   - LeagueSchema (players 配列を含む)
//   - LeagueSummarySchema (players を含まない)
//   - CreateLeagueRequestSchema (players: 8人または16人の配列を含む)
//   - UpdateLeagueRequestSchema
//   - UpdateLeagueStatusRequestSchema (status: 'active' | 'completed' | 'deleted')
//   - PlayerSchema
//   - PlayerRoleSchema
```

**警告: スキーマの変更は厳禁**
- 既存の RPC クライアントと OpenAPI 仕様を維持するため、スキーマの内容を変更してはいけない
- 特に以下のフィールドは必須:
  - `LeagueSchema.players` (配列)
  - `CreateLeagueRequestSchema.players` (8人または16人)
  - `status` enum の値 (`'active' | 'completed' | 'deleted'`)

### 4. Next.js API ルートの更新

`app/api/[...route]/route.ts` を更新し、統合された routes アプリのみをマウントする:

```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import app from '@/src/server/routes'  // 統合後のアプリ

// RPC と OpenAPI が統合されたアプリをマウント
const mainApp = new Hono().route('/', app)

export const GET = handle(mainApp)
export const POST = handle(mainApp)
export const PATCH = handle(mainApp)
export const DELETE = handle(mainApp)
```

### 5. 既存ファイルの削除

以下のディレクトリ・ファイルを削除：
- `src/server/openapi/` ディレクトリ全体
  - `openapi/index.ts`
  - `openapi/routes/`
  - ~~`openapi/schemas/`~~ (schemas/ に移動済み)

### 6. validators/ から schemas/ への統合検討

現在、バリデーションスキーマが2箇所に存在：
- `src/server/validators/leagues.ts` (RPC用、Zod)
- `src/server/schemas/leagues.ts` (OpenAPI用、Zod OpenAPI)

今後の課題として、これらを統合することを検討する。
ただし、この Issue では必須ではない（後続 Issue で対応）。

### 7. フロントエンドの動作確認

- `src/client/api.ts` - 変更不要（AppType のインポート元は同じ）
- React Query hooks - 変更不要
- 既存のフロントエンド機能が正常に動作することを確認

## 実装手順

1. `src/server/schemas/` ディレクトリを作成
2. `openapi/schemas/` から `schemas/` にスキーマファイルを移動（内容は変更しない）
3. `src/server/routes/leagues.ts` を OpenAPI ベースに書き換え
   - 既存の `openapi/routes/leagues.ts` をベースに、`routes/leagues.ts` を上書き
   - スキーマのインポートパスを `../schemas/leagues` に変更
4. `src/server/routes/players.ts` を OpenAPI ベースに書き換え
   - OpenAPI 定義を追加（現在は RPC のみ）
5. `src/server/routes/index.ts` を更新
   - `OpenAPIHono` を使用
   - Swagger UI エンドポイント (`/ui`, `/doc`) を追加
   - セキュリティスキーマを登録
   - `AppType` をエクスポート
6. `app/api/[...route]/route.ts` を更新
   - 統合された routes アプリのみをマウント
   - `openapiApp` のインポートを削除
7. `src/server/openapi/` ディレクトリを削除
8. フロントエンドの動作確認
   - React Query hooks が正常に動作するか
   - 型推論が正しく効いているか
9. Swagger UI の動作確認（`http://localhost:3000/api/ui`）
10. Biome lint/format の実行

## 完了条件

- [ ] すべてのルートが OpenAPI ベースで定義されている
- [ ] `src/server/schemas/` にスキーマが統合されている
- [ ] `app/api/[...route]/route.ts` が統合アプリのみをマウントしている
- [ ] RPC クライアントが正常に動作する（型推論も含む）
- [ ] Swagger UI が正常に動作する（`http://localhost:3000/api/ui`）
- [ ] OpenAPI 仕様が正しく生成されている（`http://localhost:3000/api/doc`）
- [ ] `src/server/openapi/` ディレクトリが削除されている
- [ ] 既存のフロントエンド機能（リーグ一覧など）が正常に動作する
- [ ] 既存の API エンドポイントがすべて動作する（`/api/leagues/:id/players/:playerId` など）
- [ ] Biome lint が通る
- [ ] CLAUDE.md のドキュメントが更新されている

## 参考資料

- [Hono - Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [Hono RPC](https://hono.dev/docs/guides/rpc)
- [@hono/zod-openapi ドキュメント](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)

## 注意事項

- バックエンド API の動作に変更はないため、既存の E2E テストは通るはず
- フロントエンドの型推論が正しく効いているか、開発時に確認する
- OpenAPI 仕様（`/api/doc`）が正しく生成されているか確認する
