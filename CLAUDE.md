# CLAUDE.md

このファイルは、Claude Code（claude.ai/code）が本リポジトリのコードを扱う際のガイドラインを示します。

---

## 基本方針

- 不明な点は積極的に質問する
- 質問する時は常に AskUserQuestion を使って回答させる
- **選択肢にはそれぞれ、推奨度と理由を提示する**
  - 推奨度は ⭐ の 5 段階評価

## プロジェクト概要

**Kojiro Mahjong App**
Next.js App Router、Hono、Drizzle ORM、Supabase を用いて構築された **麻雀リーグ管理アプリケーション**です。

---

## 開発コマンド

### セットアップ & 開発サーバー起動

```bash
bun install                # 依存パッケージのインストール
bun run dev                # Next.js 開発サーバー起動 (localhost:3000)
bunx supabase start        # Supabase ローカル環境起動
bunx supabase stop         # Supabase ローカル環境停止
```

### コード品質管理

```bash
bun run lint               # Biome によるコードチェック（サマリー表示）
bun run lint:fix           # Biome による自動修正
bun run format             # Biome によるコード整形
```

### データベース（Drizzle + Supabase）

```bash
bun run db:generate        # スキーマ変更からマイグレーション SQL を生成
bun run db:migrate         # マイグレーションを DB に適用
bun run db:push            # スキーマを DB に直接反映（ローカル開発向け）
bun run db:studio          # Drizzle Studio の UI を起動
```

**重要:**
データベーススキーマは `db/schema/` 配下にあります。
スキーマ変更後は以下を実施してください：

1. `bun run db:generate`
2. `bun run db:migrate`

---

## アーキテクチャ

### 技術スタック

| 種別           | 使用技術                                       |
| -------------- | ---------------------------------------------- |
| フロントエンド | Next.js 15 (App Router), React 19, React Query |
| バックエンド   | Hono（RPC + OpenAPI の二重 API）               |
| DB/ORM         | Supabase PostgreSQL + Drizzle ORM              |
| 認証           | Supabase Auth (JWT/Bearer)                     |
| バリデーション | Zod                                            |
| Lint/Format    | Biome                                          |
| Git Hooks      | Lefthook                                       |

---

## ディレクトリ構成

```
app/
  api/[...route]/route.ts     # Next.js APIルート - Honoアプリをマウント
  layout.tsx, page.tsx        # App Router ページ

src/
  client/
    api.ts                    # Hono RPC クライアント定義 (hc)
    hooks/                    # React Query hooks (例: useLeagues)

  server/
    routes/                   # Hono RPC ルート（型安全 API）
      index.ts                # RPC メインアプリ (AppType export)
      leagues.ts, players.ts

    openapi/                  # Hono OpenAPI ルート
      index.ts                # Swagger UI を `/api/ui` で提供
      routes/                 # OpenAPI定義
      schemas/                # Zod OpenAPIスキーマ

    services/                 # ビジネスロジック層
    repositories/             # Drizzle ORM による DB アクセス層
    validators/               # Zod スキーマ
    middleware/
      auth.ts                 # Supabase JWT 認証
      error-handler.ts        # エラーハンドラー

db/
  schema/                     # Drizzle スキーマ定義
  index.ts                    # Drizzle クライアント初期化

drizzle/                      # マイグレーション生成物
```

---

## API 構成：RPC + OpenAPI の二重パターン

本アプリの `/api` には 2 つの Hono アプリが共存します：

| 種類                                | 用途                                               |
| ----------------------------------- | -------------------------------------------------- |
| RPC API (`src/server/routes/`)      | フロントエンド用の型安全通信（React Query で利用） |
| OpenAPI API (`src/server/openapi/`) | Swagger UI による REST API ドキュメント提供        |

🔗 Swagger UI: `http://localhost:3000/api/ui`
📄 OpenAPI 仕様: `http://localhost:3000/api/doc`

---

## レイヤード構造

```
Routes → Services → Repositories → Database
```

| レイヤー     | 役割                            |
| ------------ | ------------------------------- |
| Routes       | HTTP 処理、認証、バリデーション |
| Services     | ビジネスロジック                |
| Repositories | Drizzle ORM による DB アクセス  |
| Database     | Supabase PostgreSQL             |

例: `/api/leagues` 取得フロー

```
routes/leagues.ts
  → services/leagues.ts
    → repositories/leagues.ts
      → db/index.ts
```

---

## 認証フロー

1. フロントエンドは `Authorization: Bearer <JWT>` を送信
2. `authMiddleware` が Supabase を用いて検証
3. 認証ユーザー ID を `c.get('userId')` にセット
4. Services で権限チェックに利用

---

## フロントエンドのデータ取得

- React Query + Hono RPC クライアント
- クライアントは `src/client/api.ts`
- 型安全な API: `apiClient.api.leagues.$get()`

---

## 環境変数

`.env` または `.env.local` に設定：

| 変数名                        | 説明                      |
| ----------------------------- | ------------------------- |
| DATABASE_URL                  | Postgres 接続 URL         |
| NEXT_PUBLIC_SUPABASE_URL      | Supabase プロジェクト URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名キー         |

※ `.env` は git にコミットしないでください。

### 環境変数の扱い

- **Non-null assertion (`!`) の使用を避ける**
  - 環境変数を参照する際は、`process.env.VARIABLE_NAME!` のような non-null assertion を使わない
  - 必ず明示的に存在チェックを行い、未定義の場合はエラーをスローする
  - 例:
    ```typescript
    // ❌ Bad
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!

    // ✅ Good
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!url) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL must be defined in environment variables.')
    }
    ```

---

## 開発フロー：新機能追加

1. `db/schema/` にスキーマ追加
2. `bun run db:generate`
3. `bun run db:migrate`
4. Repository 作成
5. Service 作成
6. Validator 作成
7. RPC ルート追加
8. (任意) OpenAPI ルート追加
9. React Query hook 作成
10. UI コンポーネントへ反映

---

## エラーハンドリング

- `ForbiddenError` `NotFoundError` 等をサービス内で throw
- `error-handler.ts` が HTTP レスポンスに変換
- 統一レスポンス形式：

```json
{
  "error": "ForbiddenError",
  "message": "You are not allowed to access this resource",
  "statusCode": 403
}
```

---

## マイグレーション例（トランザクション）

```ts
return db.transaction(async (tx) => {
  const [league] = await tx.insert(leaguesTable).values(...).returning()
  const players = await tx.insert(playersTable).values(...).returning()
  return { ...league, players }
})
```

---

## API ドキュメント

| 内容         | URL                             |
| ------------ | ------------------------------- |
| Swagger UI   | `http://localhost:3000/api/ui`  |
| OpenAPI JSON | `http://localhost:3000/api/doc` |

---

## 備考

- Supabase + Drizzle によるスキーマ駆動開発
- Biome によるコード品質管理
- Lefthook による pre-commit Lint 自動実行

---

💡 **Claude に期待すること例：**

- 新しい Route/Service/Repo のテンプレ生成
- Zod バリデーションの生成
- 型安全な React Query hook の生成
- OpenAPI ルート自動作成サポート
