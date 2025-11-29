# CLAUDE.md

このファイルは、Claude Code（claude.ai/code）が本リポジトリのコードを扱う際のガイドラインを示します。

---

## 基本方針

- 不明な点は積極的に質問する
- 質問する時は常に AskUserQuestion を使って回答させる
- **選択肢にはそれぞれ、推奨度と理由を提示する**
  - 推奨度は ⭐ の 5 段階評価

## プロジェクト概要

Next.js App Router、Hono、Drizzle ORM、Supabase を用いた麻雀リーグ管理アプリケーション。

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

スキーマ変更後は `bun run db:generate` → `bun run db:migrate` を実行。

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
  schemas/                    # 共有 Zod スキーマ（フロント・バック共通）
  types/                      # 共有 TypeScript 型定義

  client/
    api.ts                    # Hono RPC クライアント定義 (hc)
    hooks/                    # React Query hooks

  server/
    routes/                   # Hono RPC ルート（型安全 API）
      index.ts                # RPC メインアプリ (AppType export)

    openapi/                  # Hono OpenAPI ルート
      index.ts                # Swagger UI を `/api/ui` で提供
      routes/                 # OpenAPI定義
      schemas/                # Zod OpenAPIスキーマ（.openapi()でデコレート）

    services/                 # ビジネスロジック層
    repositories/             # Drizzle ORM による DB アクセス層
    actions/                  # Server Actions（SSR用データ取得）
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

| 種類                                | 用途                                      |
| ----------------------------------- | ----------------------------------------- |
| RPC API (`src/server/routes/`)      | フロントエンド用の型安全通信              |
| OpenAPI API (`src/server/openapi/`) | Swagger UI による REST API ドキュメント提供 |

Swagger UI: `http://localhost:3000/api/ui`

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

フロー例: `routes → services → repositories → db`

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

### AuthProvider の一元化（Client Component 用）

**重要**: Client Component で認証機能が必要な場合（ログイン、ログアウトなど）は、`useAuth()` フックを使用する。

- **全てのコンポーネントで `useAuth()` フックを使用する**
  - 各コンポーネントで `createClient()` を直接呼び出さない
  - Supabase クライアントインスタンスは AuthProvider が提供する単一のインスタンスを使用
  - 認証関連の操作（signIn, signOut）は AuthProvider が提供するメソッドを使用

- **AuthProvider は必ずルートレイアウトで有効化する**
  - `app/layout.tsx` で `Providers` コンポーネントをラップ
  - 全ページで認証状態にアクセス可能にする

```typescript
// ❌ Bad - コンポーネントで直接クライアント作成
const [supabase] = useState(() => createClient())
const handleLogin = async () => {
  await supabase.auth.signInWithPassword(...)
}

// ✅ Good - useAuth フックを使用
const { signIn, signOut, user } = useAuth()
const handleLogin = async () => {
  await signIn(email, password)
}
```

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

**役割**:
- **page.tsx**: Server Component でデータ取得（SSR）
- **Container**: React Query でキャッシュ管理、ルーティング
- **Presentational**: Props で受け取った値を表示のみ

### Next.js App Router の params 扱い

- **App Router のページ params は素のオブジェクト**
  - `Promise` 扱いしたり `await params` しないこと
  - Next.js 15 以降、params は同期的にアクセス可能

```typescript
// ❌ Bad - params を Promise として扱う
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}

// ✅ Good - params は素のオブジェクト
export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params
}
```

### 共有データ型の参照

- **サーバー側の戻り値型を参照する**
  - コンポーネントごとに同じ形を再定義しない
  - `Awaited<ReturnType<typeof functionName>>` を使用

```typescript
// ❌ Bad - コンポーネントごとに型を再定義
interface LeagueDetailContainerProps {
  initialData: {
    id: string
    name: string
    description: string | null
    // ... 全フィールドを手動で定義
  }
}

// ✅ Good - Server Action の戻り値型を参照
interface LeagueDetailContainerProps {
  initialData: Awaited<ReturnType<typeof getLeagueForUser>>
}
```

---

## スキーマとバリデーションの管理

### Zod スキーマの共通化

**`src/schemas/` にベーススキーマを配置**:
- フロント・バック両方で使用可能な基本 Zod スキーマ
- `zod` パッケージを使用（`@hono/zod-openapi` ではない）

**RPC ルート（`src/server/routes/`）**:
- `@/src/schemas/` から直接 import

**OpenAPI スキーマ（`src/server/openapi/schemas/`）**:
- `@/src/schemas/` からベーススキーマを import
- `.openapi()` でメタデータ追加
- `.extend()` で拡張可能

### Zod スキーマの一元化

UI コンポーネント内でバリデーションロジックを直接記述せず、`src/schemas/` で定義した Zod スキーマを使用する:

```typescript
// ❌ Bad - コンポーネント内に重複したバリデーション
if (!name) {
  setError('名前は必須です')
  return
}
if (name.length > 20) {
  setError('名前は20文字以内で入力してください')
  return
}

// ✅ Good - Zod スキーマでバリデーション
import { playerNameSchema } from '@/src/schemas/leagues'

const validationResult = playerNameSchema.shape.name.safeParse(input.trim())
if (!validationResult.success) {
  setError(validationResult.error.issues[0].message)
  return
}
```

**メリット**:
- バリデーションルールとエラーメッセージがスキーマ定義に集約される
- フロントエンド・バックエンドで同じルールを共有できる
- 将来的な変更時、修正箇所が一箇所に限定される

例:

```typescript
// src/schemas/leagues.ts
import { z } from 'zod'

export const createLeagueSchema = z.object({
  name: z.string().min(1).max(20),
  description: z.string().optional(),
})

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>
```

```typescript
// src/server/routes/leagues.ts
import { createLeagueSchema } from '@/src/schemas/leagues'
import { zValidator } from '@hono/zod-validator'

app.post('/', zValidator('json', createLeagueSchema), async (c) => {
  // ...
})
```

```typescript
// src/server/openapi/schemas/leagues.ts
import { z } from '@hono/zod-openapi'
import { createLeagueSchema } from '@/src/schemas/leagues'

export const CreateLeagueRequestSchema = createLeagueSchema
  .extend({
    name: z.string().min(1).max(20).openapi({
      example: '2025 Spring League',
      description: 'League name (1-20 characters)',
    }),
  })
  .openapi('CreateLeagueRequest')
```

### TypeScript 型定義の共通化

**`src/types/` に配置**:
- フロント・バック共通の TypeScript 型
- API レスポンス型、エンティティ型など

**注意**:
- Date 型は JSON シリアライズ不可のため `string` (ISO 8601) を使用
- Repository → Service 層で `Date` → `string` 変換

---

## 環境変数の管理

**`src/config/env.ts` で一元管理**:
- 各ファイルで `process.env.VARIABLE_NAME` を直接参照しない
- Non-null assertion (`!`) を使用しない
- 検証付きゲッター関数経由でアクセス

```typescript
// ❌ Bad
const url = process.env.DATABASE_URL!

// ✅ Good
import { getDatabaseUrl } from '@/src/config/env'
const url = getDatabaseUrl()
```

```typescript
// src/config/env.ts
export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be defined in environment variables.')
  }
  return databaseUrl
}
```

---

## エラーハンドリングとローディング状態

### 非同期処理での状態管理

**`finally` ブロックで状態をリセットする**:
- 成功時・失敗時の両方で確実にローディング状態をリセット
- Next.js の `router.push()` などのナビゲーション後も適切に状態管理

---

## フロントエンド実装メモ（リーグ設定関連）

- App Router の `params` はオブジェクト（`Promise` ではない）。`await params` しない。
- サーバーアクションの戻り値型を再利用する（例: `Awaited<ReturnType<typeof getLeagueForUser>>`）。型をコンポーネントごとに再定義しない。
- React Hook Form の配列は `useFieldArray` で扱い、`watch` で全体再レンダリングを誘発しない。
- 送信中フラグは `form.formState.isSubmitting` を使い、独自 state を持たない。
- リーグ設定更新ではステータスも必ず `useUpdateLeagueStatus` で永続化する（名前・説明のみで終わらせない）。

```typescript
// ❌ Bad - 成功時に loading がリセットされない
const onSubmit = async (data) => {
  setLoading(true)
  try {
    await signIn(data)
    if (error) {
      setLoading(false) // エラー時のみリセット
      return
    }
    router.push('/dashboard') // 成功時はリセットされず disabled のまま
  } catch (err) {
    setLoading(false)
  }
}

// ✅ Good - finally で必ずリセット
const onSubmit = async (data) => {
  setLoading(true)
  try {
    await signIn(data)
    if (error) {
      return
    }
    router.push('/dashboard')
  } catch (err) {
    // エラーハンドリング
  } finally {
    setLoading(false) // 必ず実行される
  }
}
```

**理由**: ナビゲーション後にユーザーが戻ってきた場合でも、フォームが使用可能な状態を保つため。

---

## 開発フロー：新機能追加

1. `db/schema/` にスキーマ追加 → `db:generate` → `db:migrate`
2. Repository 作成
3. Service 作成
4. `src/schemas/` にバリデーションスキーマ作成
5. RPC ルート追加
6. (任意) OpenAPI ルート追加
7. `src/types/` に型定義追加
8. React Query hook 作成
9. UI コンポーネント実装

---

## UI/UX 開発の方針

### shadcn/ui

- 必要なコンポーネントを都度追加: `bunx shadcn@latest add <component>`
- 事前に全コンポーネントをインストールしない
- **`components/ui/` 内のコンポーネントには `'use client'` を追加しない**
  - これらは shared components として Server/Client 両方から使えるべき
  - `'use client'` は実際に使う側のコンポーネント（例: `create-league-dialog.tsx`）で宣言する

### UI 定義の定数化

**選択肢の動的生成**:

ハードコードされた選択肢は定数配列として定義し、`.map()` で動的生成する:

```tsx
// ❌ Bad - ハードコード
<RadioGroupItem value="8" id="player-count-8" />
<label htmlFor="player-count-8">8人</label>
<RadioGroupItem value="16" id="player-count-16" />
<label htmlFor="player-count-16">16人</label>

// ✅ Good - 定数 + map
const PLAYER_COUNT_OPTIONS = [8, 16] as const

{PLAYER_COUNT_OPTIONS.map((count) => (
  <div key={count}>
    <RadioGroupItem value={count.toString()} id={`player-count-${count}`} />
    <label htmlFor={`player-count-${count}`}>{count}人</label>
  </div>
))}
```

**メリット**:
- 選択肢の追加・変更が配列の修正のみで完結
- 修正箇所が一箇所に限定される
- タイポやコピペミスを防げる

### デザイン原則

- 余計な情報は載せない
- 実装する機能が決まっていない要素は表示しない
- ユーザーから要件が提示されるまで推測で作り込まない

### カラー指定

- shadcn/ui 変数を使用（`bg-primary`, `text-foreground` 等）
- カスタム CSS 変数（`--ds-*`）を直接使わない
