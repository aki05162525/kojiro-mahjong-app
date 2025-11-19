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

**Lint/Format のワークフロー:**
- **保存時自動修正 + コミット時チェック**の構成
  - VSCode: `editor.formatOnSave: true` で保存時に自動修正
  - Lefthook: `pre-commit` ではチェックのみ（修正しない）
  - 理由: 二重実行を避け、開発体験を最適化
  - lefthook.yml の設定:
    ```yaml
    pre-commit:
      commands:
        biome:
          run: bunx biome check --no-errors-on-unmatched {staged_files}
          # ❌ lint:fix は使わない（保存時に既に修正済み）
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

## 認証の実装パターン

### Supabase SSR の使用

- **Server Component での認証**: `@supabase/ssr` の `createServerClient` を使用
- **Client Component での認証**: `@supabase/ssr` の `createBrowserClient` を使用
- **Middleware での認証トークン更新**: `middleware.ts` で全リクエストに対してトークンをリフレッシュ

```typescript
// Server Component 用クライアント (src/server/supabase.ts)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) { /* ... */ }
    }
  })
}

// Client Component 用クライアント (src/client/supabase.ts)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(url, anonKey)
}
```

### 認証状態の取得

- **Server Component**: `await supabase.auth.getUser()` でサーバー側で取得
- **Client Component**: インタラクティブな部分のみクライアントコンポーネント化
- **非推奨**: `useAuth` のような Client 側専用フックは使わない（SSR を優先）

### API 認証フロー（Hono RPC）

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

## コンポーネント設計パターン

### Container/Presentational パターンの採用

リーグ一覧など、データ取得とUIを分離する場合は以下のパターンを使用:

```
components/features/[feature]/
├── [feature]-list.tsx        # Presentational（見た目のみ）
└── [feature]-container.tsx   # Container（ロジック）

app/[feature]/
└── page.tsx                  # Server Component（データ取得）

src/server/actions/
└── [feature].ts              # Server Action（データ取得関数）
```

**役割分担**:
- **page.tsx** (Server Component): サーバー側でデータ取得、SSR
- **Container** (Client Component): React Query でキャッシュ管理、ルーティング、エラーハンドリング
- **Presentational** (Client/Server Component): 純粋な表示ロジックのみ、props で受け取った値を表示

**メリット**:
- 初回は SSR で高速表示
- 2回目以降は React Query のキャッシュで瞬時に表示
- テスタブル（Presentational Component は props を渡すだけでテスト可能）

---

## 型定義の管理

### 共通型ファイルの使用

フロントエンド・バックエンド間で共有する型は `src/types/` に定義:

```typescript
// src/types/league.ts
export interface League {
  id: string
  name: string
  description: string | null
  status: LeagueStatus
  createdBy: string
  createdAt: string  // ISO 8601 形式
  updatedAt: string  // ISO 8601 形式
}

export interface LeaguesResponse {
  leagues: League[]
}
```

**使用箇所**:
- Server Actions (`src/server/actions/`)
- Services (`src/server/services/`)
- React Components (`components/features/`)
- API Routes (`src/server/routes/`)

**注意点**:
- Date 型は JSON シリアライズできないため、API レスポンスでは `string` (ISO 8601) を使用
- Repository → Service 層で `Date` から `string` への変換を行う

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

- **環境変数は `src/config/env.ts` で一元管理する**
  - 各ファイルで `process.env.VARIABLE_NAME` を直接参照しない
  - 必ず `src/config/env.ts` の関数経由でアクセスする
  - Non-null assertion (`!`) の使用を避ける
  - 例:
    ```typescript
    // ❌ Bad - 各ファイルで直接参照
    const url = process.env.DATABASE_URL!

    // ❌ Bad - 各ファイルで検証ロジックを書く
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL must be defined in environment variables.')
    }

    // ✅ Good - config/env.ts の関数を使用
    import { getDatabaseUrl } from '@/src/config/env'
    const url = getDatabaseUrl()
    ```

### config/env.ts の実装パターン

- **検証付きゲッター関数を作成する**
  - 環境変数ごとに専用の関数を作成
  - 未定義の場合は明確なエラーメッセージを投げる
  - 例:
    ```typescript
    export function getDatabaseUrl(): string {
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        throw new Error('DATABASE_URL must be defined in environment variables.')
      }
      return databaseUrl
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

## UI/UX 開発の方針

### shadcn/ui コンポーネントの使用

- **必要なコンポーネントは都度追加する**
  - 事前に全コンポーネントをインストールしない
  - 使用するタイミングで `bunx shadcn@latest add <component>` で追加
  - 未使用コードを避け、プロジェクトサイズを最小限に保つ

### デザイン原則

- **余計な情報は載せない**
  - 実装する機能が決まっていない画面では、不確定な要素（ダッシュボードカード、お知らせ、統計情報など）を表示しない
  - 「将来的に追加予定」のメッセージや機能も含めない
  - シンプルで必要最小限のUIを維持する
  - ユーザーから明確な要件が提示されるまで、推測でUIを作り込まない

### 既存のshadcn/ui変数を優先使用

- Tailwind CSS のカラー指定では、カスタムCSS変数（`--ds-*`など）を直接使わない
- 既存の shadcn/ui 変数（`bg-primary`, `text-foreground`, `text-muted-foreground`など）を使用する
- `globals.css` で内部的にマッピング済みなので、shadcn/ui の変数経由で Atlassian Design System の色が適用される

---

💡 **Claude に期待すること例：**

- 新しい Route/Service/Repo のテンプレ生成
- Zod バリデーションの生成
- 型安全な React Query hook の生成
- OpenAPI ルート自動作成サポート
