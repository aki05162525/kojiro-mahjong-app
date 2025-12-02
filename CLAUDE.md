# CLAUDE.md

Claude Code（claude.ai/code）用ガイドライン。

## 基本方針

- 不明点は積極的に質問する (`AskUserQuestion`)
- **選択肢には推奨度（⭐5段階）と理由を提示する**

## プロジェクト概要

Next.js 15 (App Router), Hono, Drizzle ORM, Supabase を用いた麻雀リーグ管理アプリ。

## 開発コマンド

```bash
bun install                # 依存インストール
bun run dev                # Next.js 開発サーバー (localhost:3000)
bunx supabase start/stop   # Supabase ローカル起動/停止

bun run lint               # Biome チェック
bun run lint:fix           # Biome 自動修正
bun run format             # Biome 整形
# ※ VSCode `formatOnSave: true` 推奨。lefthookはチェックのみ。

bun run db:generate        # マイグレーション生成
bun run db:migrate         # DB適用
bun run db:push            # スキーマ直接反映 (開発用)
bun run db:studio          # Drizzle Studio 起動
```

## アーキテクチャ

**構成**: `Routes (RPC) → Services (Logic) → Repositories (DB) → Database`

| 種別 | 技術 | 備考 |
| --- | --- | --- |
| フロント | Next.js 15, React 19, React Query | App Router |
| バック | Hono | RPC + OpenAPI の二重構成 |
| DB | Supabase (PostgreSQL), Drizzle ORM | |
| 認証 | Supabase Auth | JWT/Bearer |
| 検証 | Zod | `src/schemas/` で共通化 |

**ディレクトリ**:
- `app/api/`: Honoマウント
- `src/client/`: RPCクライアント, Hooks
- `src/server/`: Routes(RPC), OpenAPI, Services, Repositories
- `db/`: Drizzleスキーマ

## 実装ガイドライン

### 1. 認証 (Supabase SSR)

- **Server**: `createServerClient` (`src/server/supabase.ts`)
- **Client**: `useAuth()` フックを使用（`createBrowserClient` 直接使用禁止）
- **AuthProvider**: ルートレイアウトでラップし、単一インスタンスを提供

```typescript
// ✅ Good - useAuth フックを使用
const { signIn, signOut, user } = useAuth()
const handleLogin = async () => await signIn(email, password)
```

### 2. コンポーネント設計

- **Container/Presentational**: ロジック(`-container.tsx`)と表示(`-list.tsx`)を分離
- **Next.js 15 Params**: `await params` が必須
- **共有型**: Server Actionの戻り値型 `Awaited<ReturnType<typeof func>>` を利用

```typescript
// ✅ Good - params を await する
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}
```

### 3. スキーマ & バリデーション (Zod)

- **共通化**: `src/schemas/` にベースを定義し、RPC/OpenAPI双方から参照
- **DRY**: コンポーネント内でバリデーションを書かず、スキーマを利用
- **OpenAPI**: ベーススキーマを `.extend().openapi()` で拡張し、ロジック重複を避ける
  - ⚠️ **制限事項**: `zod` と `@hono/zod-openapi` は型互換性がないため、複雑なバリデーション（`.refine()` など）を持つスキーマは `.extend()` でインポートできない場合があります。その場合はコメントで関係性を明記し、バリデーションロジックを再定義してください。

```typescript
// src/schemas/leagues.ts
export const createLeagueSchema = z.object({ name: z.string().min(1).max(20) })

// src/server/openapi/schemas/leagues.ts
// ✅ Good - ベーススキーマを再利用（シンプルなスキーマの場合）
export const CreateLeagueRequestSchema = createLeagueSchema
  .extend({ name: z.string().openapi({ example: 'League' }) })
  .openapi('CreateLeagueRequest')

// ⚠️ 複雑なバリデーション（.refine()）がある場合は再定義が必要
// src/server/schemas/scores.ts
/**
 * NOTE: バリデーションロジックはベーススキーマ（src/schemas/scores.ts）と同じですが、
 * zod と @hono/zod-openapi の型互換性がないため、.extend() でインポートできません。
 */
export const UpdateTableScoresRequestSchema = z.object({ ... }).refine(...)
```

### 4. データベース

- **トランザクション**: 複数更新は必ず `db.transaction(async (tx) => ...)` で囲む
- **環境変数**: `src/config/env.ts` 経由でアクセス（`process.env` 直接参照禁止）

```typescript
// ✅ Good - トランザクション内で実行
await db.transaction(async (tx) => {
  for (const item of items) {
    await tx.update(scoresTable).set({ ... }).where(eq(scoresTable.id, item.id))
  }
})
```

### 5. UI/UX (shadcn/ui) & React

- **追加**: `bunx shadcn@latest add <component>` (必要なものだけ)
- **'use client'**: `components/ui/` には付けず、利用側で付ける
- **非同期状態**: `finally` でローディング状態を確実にリセット
- **配列操作**: `sort`, `splice` 等はコピーを作成してから実行 (`[...array].sort()`)
- **定数化**: 選択肢などは定数配列 + `.map()` で生成
- **グローバル定数**: 複数ファイルで使用する定数は `src/constants/` に配置してインポート

```typescript
// ✅ Good - finally で必ずリセット
try {
  await signIn(data)
  router.push('/dashboard')
} catch (err) {
  // エラー処理
} finally {
  setLoading(false)
}

// ❌ Bad - マジックナンバーが複数ファイルに分散
// file1.ts
const TOTAL_SCORE = 100000
// file2.ts
return total === 100000

// ✅ Good - 共通定数ファイルを作成
// src/constants/mahjong.ts
export const TOTAL_SCORE = 100000
// 各ファイルでインポート
import { TOTAL_SCORE } from '@/src/constants/mahjong'
```

#### React Query キャッシュ無効化の最適化

mutation成功時のキャッシュ無効化は、できるだけ具体的なクエリキーを指定する。

```typescript
// ❌ Bad - 全リーグのキャッシュを無効化（非効率）
export const useUpdateScores = () => {
  return useMutation({
    mutationFn: async ({ tableId, scores }) => { /* ... */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

// ✅ Good - 特定のリーグのキャッシュのみを無効化
export const useUpdateScores = () => {
  return useMutation({
    mutationFn: async ({ tableId, leagueId, scores }) => { /* ... */ },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leagues', variables.leagueId] })
    },
  })
}
```

### 6. セキュリティ & エラーハンドリング

- **権限チェック**: 現在ログイン中のユーザーID (`currentUserId`) と比較する
- **エラー**: `HTTPException` (Hono) や `BadRequestError` (Custom) を使用し、適切なステータスコードを返す

```typescript
// ✅ Good - 現在のユーザーで権限チェック
const isAdmin = league.players.some(p => p.userId === currentUserId && p.role === 'admin')
```

## 開発フロー

1. `db/schema/` 追加 → `db:generate` → `db:migrate`
2. Repository → Service → Zod Schema 作成
3. RPC Route (+ OpenAPI) 追加
4. React Query Hook 作成
5. UI 実装