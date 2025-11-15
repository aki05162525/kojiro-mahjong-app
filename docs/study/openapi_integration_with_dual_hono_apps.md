# 📄 openapi_integration_with_dual_hono_apps.md

## 1. 今回実装した機能の概要

既存のHono RPCアプリケーションを維持しながら、OpenAPI仕様書とSwagger UIを提供する並行システムを構築しました。`src/server/routes/`（RPC用）と`src/server/openapi/`（ドキュメント用）の2つの独立したHonoアプリを用意し、Next.jsのAPIハンドラーで両方をマウントすることで、フロントエンド向けの型安全なAPIとドキュメント生成を両立させました。また、OpenAPIスキーマとRPCバリデータ間でAPIコントラクトの一貫性を保つため、ペイロード形式の統一と適切なバリデーション戦略を実装しました。

---

## 2. 技術的学び（重要ポイントまとめ）

### Honoのルート解決順序とアプリマウンティング

**原理:**
Honoは登録順に最初にマッチしたハンドラーを実行し、`await next()`が呼ばれない限り後続のハンドラーには到達しません。これはExpressのようなミドルウェアチェーンとは異なり、明示的にnextを呼ばないと次のハンドラーが実行されない設計です。

**今回の適用:**
```typescript
// app/api/[...route]/route.ts
app.route('/', rpcApp)      // 先にマウント → ビジネスロジックのエンドポイント処理
app.route('/', openapiApp)  // 後にマウント → RPCに存在しないルート（/doc, /ui）を処理
```

- **RPCアプリが先:** `POST /api/leagues`などのビジネスロジックエンドポイントはRPC appが処理
- **OpenAPIアプリが後:** `/api/doc`や`/api/ui`はRPC appに定義されていないため、OpenAPI appにフォールスルー

**よくあるミス:**
OpenAPI appを先にマウントすると、同じパスのエンドポイントがOpenAPI側で処理され、RPC clientの型推論が壊れます。

### Zodの`@hono/zod-openapi`と通常の`zod`の使い分け

**技術的背景:**
- **通常の`zod`**: ランタイムバリデーションのみ。OpenAPIメタデータ（`example`, `description`）を持たない
- **`@hono/zod-openapi`**: Zodのラッパーで、`.openapi()`メソッドでOpenAPI仕様に必要なメタデータを追加可能

**アーキテクチャ上の分離:**
| 用途 | インポート | 理由 |
|------|-----------|------|
| RPCバリデータ (`src/server/validators/`) | `zod` | フロントエンド向け、OpenAPIメタデータ不要 |
| OpenAPIスキーマ (`src/server/openapi/schemas/`) | `@hono/zod-openapi` | Swagger UI表示用にexample/description必須 |

**混在させてはいけない理由:**
RPCルートで`@hono/zod-openapi`を使うと、不要な依存が増え、RPCクライアントの型推論に影響する可能性があります。また、OpenAPIスキーマで通常の`zod`を使うと`.openapi()`メソッドが使えず、ドキュメント生成が不完全になります。

### バリデーション戦略の統一性

**問題:**
当初、OpenAPIのリーグ作成エンドポイントは`{ playerCount, playerNames }`形式を受け取り、内部で`{ players: [{ name }] }`に変換していましたが、これはRPCエンドポイントと異なるAPIコントラクトを持つことになります。

**解決:**
両方のアプリで同じペイロード形式`{ players: [{ name }] }`を使用し、バリデーション方法も統一：
```typescript
// RPC validators (zod)
players: z.union([
  z.array(playerNameSchema).length(8),
  z.array(playerNameSchema).length(16)
])

// OpenAPI schemas (@hono/zod-openapi)
players: z.union([
  z.array(PlayerNameSchema).length(8),
  z.array(PlayerNameSchema).length(16)
]).openapi({ example: [...], description: '...' })
```

**`.refine()` vs `z.union()`:**
- `.refine()`: カスタムバリデーション、エラーメッセージをコントロール可能
- `z.union()`: 型レベルで制約を表現、OpenAPIスキーマにより正確に反映

今回は一貫性のため`z.union()`を採用しました。

### レスポンススキーマとリポジトリ層の返り値の一致

**問題:**
`updateLeagueStatus`がリポジトリ層で`{ id, status, updatedAt }`のみを返すのに、OpenAPIスキーマは完全な`LeagueSchema`（playersを含む）を宣言していました。

**解決:**
サービス層でリポジトリ関数を呼んだ後、常に`getLeagueById()`で完全なLeagueオブジェクトを取得して返すパターンに統一：
```typescript
await leaguesService.updateLeagueStatus(leagueId, userId, status)
const league = await leaguesService.getLeagueById(leagueId, userId)  // 完全なオブジェクト取得
return c.json(league, 200)
```

**トレードオフ:**
- **利点:** APIコントラクトが一貫し、ドキュメントと実装が一致
- **欠点:** データベースクエリが1回増える（パフォーマンスへの影響は微小）

実務では一貫性を優先し、パフォーマンスが問題になる場合はリポジトリ層で完全なオブジェクトを返すよう修正します。

---

## 3. 技術選定の理由・トレードオフ

### デュアルHonoアプリケーション構成

**選択した理由:**
- **Hono RPC**: フロントエンドとの型安全な通信に最適化
- **OpenAPIHono**: 外部クライアント、モバイルアプリ、SDK生成のためのドキュメント提供

**他の選択肢:**
1. **単一のOpenAPIHonoアプリ:** すべてをOpenAPIで統一
   - 欠点: Hono RPCの型推論が弱くなる、フロントエンドの開発体験が低下
2. **tRPC:** 型安全なRPCフレームワーク
   - 欠点: OpenAPI仕様書を別途生成する必要がある、Hono RPCより学習コストが高い

**採用した構成の利点:**
- フロントエンド開発者はHono RPCで型安全に開発
- 外部開発者はSwagger UIで仕様を確認
- 両者が独立しているため、片方の変更が他方に影響しない

**欠点:**
- 2つのアプリを保守する必要がある
- APIコントラクトの一貫性を手動で保つ必要がある（今回はペイロード統一で対処）

### サービス層の共有とルート層の分離

**アーキテクチャ:**
```
RPC Routes ─┐
            ├─→ Services → Repositories → Database
OpenAPI Routes ─┘
```

**理由:**
- ビジネスロジックはサービス層に集約し、ルート層は薄く保つ
- RPCとOpenAPIで同じビジネスロジックを再利用
- テストもサービス層に集中すれば、両方のAPIで動作保証される

**トレードオフ:**
- サービス層の変更が両方のAPIに影響するため、後方互換性の維持が重要
- ルート層が薄いため、ルート固有の処理（リクエスト変換など）が複雑になりがち
  - 今回は変換処理を排除してペイロード統一で解決

---

## 4. 苦労した点と解決したポイント

### 1. RPCルートとOpenAPIルートの競合

**問題:**
当初、`src/server/routes/index.ts`に`app.doc('/doc')`や`swaggerUI`を含めていたため、OpenAPIアプリの`/api/doc`と競合し、常にRPCアプリの最小限のレジストリが返されていました。

**解決プロセス:**
1. Honoのルート解決が登録順であることを再確認
2. RPCルートから一切のOpenAPI関連コードを削除
3. `OpenAPIHono`を`Hono`に変更
4. マウント順序を明示的にドキュメント化（RPC → OpenAPI）

**得た知見:**
フレームワークのルーティング動作を正確に理解することの重要性。表面的な動作だけでなく、内部的なマッチング順序を把握することで、予期しない動作を回避できます。

### 2. OpenAPIスキーマとRPCバリデータの二重管理

**問題:**
`CreateLeagueRequestSchema`をRPC用とOpenAPI用で別々に定義していたため、ペイロード形式が異なり（`playerCount/playerNames` vs `players`）、APIコントラクトが一貫しませんでした。

**解決プロセス:**
1. 実際のサービス層が受け取る形式を確認（`{ players: [{ name }] }`）
2. OpenAPIスキーマをRPCと同じ形式に変更
3. バリデーション方法も`z.union()`で統一
4. ハンドラー内の変換処理を削除

**得た知見:**
APIコントラクトの一貫性は、複数のクライアントをサポートする際の最重要ポイント。スキーマ定義を二重管理する場合、両者が同じペイロードを期待するよう、明示的に統一する必要があります。

### 3. レスポンススキーマと実装の不一致

**問題:**
`PATCH /api/leagues/:id/status`がOpenAPIスキーマでは完全な`LeagueSchema`を返すと宣言しているのに、実際にはRPCルートが`{ id, status, updatedAt }`のみを返していました。

**解決プロセス:**
1. リポジトリ層の返り値を確認
2. すべてのPATCHエンドポイントでサービス層の更新後に`getLeagueById()`を呼び出すパターンに統一
3. RPCとOpenAPIの両方で同じパターンを適用

**得た知見:**
OpenAPIドキュメントと実装が乖離すると、クライアント側で予期しないフィールドが現れ、型エラーやランタイムエラーの原因になります。ドキュメント駆動開発の重要性を実感しました。

### 4. 文字エンコーディングとBiomeのエラー

**問題:**
日本語コメント付きのファイルをWriteツールで作成した際、UTF-8エンコーディングが正しく保存されず、Biomeが"stream did not contain valid UTF-8"エラーを出しました。

**解決:**
bashのheredocを使って確実にUTF-8で保存するか、英語コメントに統一することで解決しました。

---

## 5. 技術面接で話せる要点（箇条書き）

**何を作ったか:**
- 既存のHono RPCアプリケーションを維持しながら、OpenAPI仕様書とSwagger UIを追加
- `src/server/routes/`（フロントエンド用）と`src/server/openapi/`（ドキュメント用）の2つの並行Honoアプリ
- Next.jsのAPIハンドラーで両方をマウントし、ルート解決順序を制御

**なぜその技術を使ったか:**
- **Hono RPC**: フロントエンドとの型安全な通信のため（tRPCより軽量でHonoエコシステムと統合しやすい）
- **OpenAPIHono**: 外部クライアント、モバイルアプリ、SDK生成のためのドキュメント提供
- **デュアルアプリ構成**: 各用途に最適化されたアプリを独立して保守できる

**技術的な工夫:**
- Honoのルート解決順序を利用し、RPC appを先にマウントすることで型安全性を維持
- RPCとOpenAPIでAPIコントラクト（ペイロード形式、レスポンス形式）を統一
- サービス層を共有し、ビジネスロジックの重複を排除
- `zod`と`@hono/zod-openapi`を適切に使い分け、不要な依存を避けた

**学んだこと:**
- フレームワークのルート解決アルゴリズムを正確に理解することの重要性
- APIコントラクトの一貫性が複数クライアント対応の鍵
- OpenAPIドキュメントと実装の乖離を防ぐため、スキーマ定義と実装を常に同期させる
- バリデーション戦略（`.refine()` vs `z.union()`）の選択が型推論とドキュメント生成に影響

**次に活かせること:**
- API versioning（`/api/v1`, `/api/v2`）の実装でも同じマウント順序パターンを応用可能
- GraphQLとRESTを並行運用する際のアーキテクチャ設計の参考になる
- SDK自動生成ツール（`openapi-generator`）と組み合わせて、外部クライアント開発を加速

---

## 6. 今後の改善点・次のステップ

### 今回の実装の改善ポイント

1. **APIコントラクトの自動検証:**
   - RPCとOpenAPIのスキーマが一致しているかを自動テストで検証
   - 例: `POST /api/leagues`のペイロードをRPCとOpenAPIの両方でテストし、同じレスポンスが返ることを確認

2. **共通スキーマの抽出:**
   - `PlayerNameSchema`のような共通部分を`src/server/schemas/common/`に抽出
   - RPCとOpenAPIで同じ基底スキーマを拡張する形に統一

3. **レスポンスの最適化:**
   - `PATCH`エンドポイントで毎回`getLeagueById()`を呼ぶのではなく、リポジトリ層で完全なオブジェクトを返すよう修正
   - N+1クエリ問題を避けるため、Drizzleの`with`を活用

4. **OpenAPIスキーマの自動生成:**
   - Zodスキーマから自動的にOpenAPIスキーマを生成するツール（`zod-to-openapi`）の導入を検討

### 実務者として次に学習すべき技術

1. **API Versioning:**
   - `/api/v1`, `/api/v2`のようなバージョン管理
   - 既存クライアントとの互換性を保ちつつ新機能を追加する戦略

2. **SDK自動生成:**
   - OpenAPI仕様書から TypeScript/JavaScript SDKを生成（`@hey-api/openapi-ts`, `openapi-generator`）
   - クライアント開発の効率化とAPIコントラクトの強制

3. **APIドキュメントの進化:**
   - Swagger UIより美しい`@scalar/hono-api-reference`への移行
   - APIの例やコードサンプルを充実させる

4. **契約テスト（Contract Testing）:**
   - Pactなどのツールで、クライアントとサーバーのAPIコントラクトが一致していることを自動検証
   - マイクロサービス間の通信でも応用可能

### 伸ばすべきスキル

- **API設計のベストプラクティス:** RESTful設計原則、GraphQL、gRPCとの比較
- **パフォーマンス最適化:** データベースクエリの最適化、キャッシュ戦略
- **テスト戦略:** 統合テスト、E2Eテスト、契約テストの実装

### 次回プロジェクトで活かせる点

- デュアルアプリ構成のパターンは、REST APIとGraphQLを並行運用する際にも応用可能
- ルート解決順序の理解は、マイクロサービスのAPIゲートウェイ設計でも重要
- OpenAPIドキュメント駆動開発のアプローチは、チーム開発でAPIコントラクトを明確化する際に有効

---

**作成日:** 2025-01-15
