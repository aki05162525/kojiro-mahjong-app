# ステップ4: フロントエンド統合 - 実装タスク

このステップでは、Hono RPCクライアントとReact Queryを使って、バックエンドAPIとフロントエンドを型安全に統合します。

**目標:**
- Hono RPCクライアントの初期化（エンドツーエンド型安全性の実現）
- React Query Hooksの作成（データフェッチング・ミューテーションの管理）

---

## タスク8: RPCクライアント初期化

### ファイル: `src/client/api.ts`

### 実装内容

Hono RPCクライアントを初期化し、バックエンドで定義したAPIの型情報をフロントエンドで利用できるようにします。

### 必要なパッケージ

```bash
# hono/client はhono本体に含まれているため、追加インストール不要
# ただし、型のみのインポートとして使用
```

### 実装例

```typescript
import { hc } from 'hono/client'
import type { AppType } from '@/src/server/routes'

// RPCクライアントを初期化
export const apiClient = hc<AppType>('http://localhost:3000')
```

**本番環境用の設定（オプション）:**

```typescript
import { hc } from 'hono/client'
import type { AppType } from '@/src/server/routes'

// 環境に応じたベースURLの取得
const getBaseUrl = () => {
  // ブラウザ環境の場合は現在のオリジンを使用
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // サーバー環境の場合はデフォルト
  return 'http://localhost:3000'
}

export const apiClient = hc<AppType>(getBaseUrl())
```

### 実装のポイント

1. **型のみのインポート (`type` キーワード)**
   - `AppType` は型情報のみをインポートするため、`import type` を使用
   - これにより、コンパイル後のJavaScriptにはインポート文が含まれません（バンドルサイズ削減）

2. **`hc` 関数とジェネリクス**
   - `hc<AppType>()` のようにジェネリクスで型を渡すことで、完全な型推論が有効になります
   - これにより、`apiClient.api.leagues.$get()` のようなメソッドチェーンで型安全性が保証されます

3. **ベースURL**
   - 開発環境では `http://localhost:3000` を使用
   - 本番環境では環境変数や `window.location.origin` を使用することを推奨

### テスト方法

1. **型チェックの確認**
   ```bash
   # TypeScriptのコンパイルエラーがないことを確認
   bun run build
   ```

2. **エディタでの型補完テスト**
   - 別のファイルで `import { apiClient } from '@/src/client/api'` をインポート
   - `apiClient.api.leagues.` と入力した際に、`$get`, `$post` などのメソッドが補完されることを確認

### 📚 公式ドキュメント

**Hono RPC:**
- [Hono RPC 公式ガイド](https://hono.dev/docs/guides/rpc) - RPC機能の基本的な使い方
- [Hono Stacks](https://hono.dev/docs/concepts/stacks) - Honoのアーキテクチャ概念
- [Hono RPC ブログ記事](https://blog.yusu.ke/hono-rpc/) - Hono作者による詳細な解説

**型安全性:**
- [Hono RPC and TypeScript](https://dev.to/mmvergara/elegant-error-handling-and-end-to-end-typesafety-with-hono-rpc-29m7) - エラーハンドリングと型安全性
- [Hono RPC in Monorepos](https://catalins.tech/hono-rpc-in-monorepos/) - モノレポでの型参照設定

**重要な注意点:**
- `AppType` は必ず `src/server/routes/index.ts` からエクスポートされた型を使用すること
- すべてのルートを1つの式でチェーンしないと、型推論が正しく機能しません
- `type-only import` を使うことでバンドルサイズを最小化できます

---

## タスク9: React Query Hooks作成

### ファイル: `src/client/hooks/useLeagues.ts`

### 実装内容

React Queryを使って、コンポーネントから簡単にAPIを呼び出せるカスタムフックを作成します。

### 必要なパッケージ

```bash
# React Query v5のインストール
bun add @tanstack/react-query

# (オプション) React Query DevTools
bun add @tanstack/react-query-devtools
```

### 実装例

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type InferRequestType } from 'hono/client'
import { apiClient } from '../api'

type CreateLeagueInput = InferRequestType<typeof apiClient.api.leagues.$post>['json']
type UpdateLeagueInput = InferRequestType<typeof apiClient.api.leagues[':id'].$patch>['json']
type UpdateLeagueStatusInput =
  InferRequestType<typeof apiClient.api.leagues[':id'].status.$patch>['json']

// ------------------------
// Query Hooks (データ取得)
// ------------------------

/**
 * リーグ一覧を取得
 */
export const useLeagues = () => {
  return useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const res = await apiClient.api.leagues.$get()
      if (!res.ok) {
        throw new Error('Failed to fetch leagues')
      }
      return await res.json()
    },
  })
}

/**
 * リーグ詳細を取得
 * @param leagueId - リーグID
 */
export const useLeague = (leagueId: string) => {
  return useQuery({
    queryKey: ['leagues', leagueId],
    queryFn: async () => {
      const res = await apiClient.api.leagues[':id'].$get({
        param: { id: leagueId },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch league')
      }
      return await res.json()
    },
    // リーグIDがない場合はクエリを無効化
    enabled: !!leagueId,
  })
}

// ------------------------
// Mutation Hooks (データ更新)
// ------------------------

/**
 * リーグを作成
 */
export const useCreateLeague = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateLeagueInput) => {
      const res = await apiClient.api.leagues.$post({
        json: data,
      })
      if (!res.ok) {
        throw new Error('Failed to create league')
      }
      return await res.json()
    },
    onSuccess: () => {
      // リーグ一覧のキャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

/**
 * リーグを更新
 */
export const useUpdateLeague = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      leagueId,
      data,
    }: {
      leagueId: string
      data: UpdateLeagueInput
    }) => {
      const res = await apiClient.api.leagues[':id'].$patch({
        param: { id: leagueId },
        json: data,
      })
      if (!res.ok) {
        throw new Error('Failed to update league')
      }
      return await res.json()
    },
    onSuccess: () => {
      // リーグ関連のクエリ（一覧・詳細）を一括無効化
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

/**
 * リーグを削除（論理削除）
 */
export const useDeleteLeague = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (leagueId: string) => {
      const res = await apiClient.api.leagues[':id'].$delete({
        param: { id: leagueId },
      })
      if (!res.ok) {
        throw new Error('Failed to delete league')
      }
    },
    onSuccess: () => {
      // リーグ一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

/**
 * リーグステータスを変更
 */
export const useUpdateLeagueStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      leagueId,
      status,
    }: {
      leagueId: string
      status: UpdateLeagueStatusInput['status']
    }) => {
      const res = await apiClient.api.leagues[':id'].status.$patch({
        param: { id: leagueId },
        json: { status },
      })
      if (!res.ok) {
        throw new Error('Failed to update league status')
      }
      return await res.json()
    },
    onSuccess: () => {
      // リーグ関連のクエリ（一覧・詳細）を一括無効化
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}
```

### 実装のポイント

1. **`queryKey` の設計**
   - 一覧: `['leagues']`
   - 詳細: `['leagues', leagueId]`
   - 階層的な設計により、部分的なキャッシュ無効化が可能

2. **`queryClient.invalidateQueries`**
   - データ更新後、関連するクエリのキャッシュを無効化して再取得
   - `{ queryKey: ['leagues'] }` は `['leagues']` で始まるすべてのキーに適用される

3. **エラーハンドリング**
   - `res.ok` で HTTPステータスコードをチェック
   - エラー時は `throw new Error()` でReact Queryのエラー状態に伝播

4. **型推論**
   - Hono RPCにより、`json` プロパティや `param` プロパティの型が自動推論される
   - TypeScriptの補完が効くため、タイプミスを防げる

5. **`enabled` オプション**
   - 条件付きでクエリを実行する場合に使用
   - 例: IDが存在する場合のみ詳細取得

### テスト方法

1. **コンポーネントでの使用例**
   ```tsx
   'use client'

   import { useLeagues, useCreateLeague } from '@/src/client/hooks/useLeagues'

   export default function LeaguesPage() {
     const { data, isLoading, error } = useLeagues()
     const createLeague = useCreateLeague()

     if (isLoading) return <div>Loading...</div>
     if (error) return <div>Error: {error.message}</div>

     return (
       <div>
         <h1>Leagues</h1>
         <button
           onClick={() => {
             createLeague.mutate({
               name: 'Test League',
               players: Array.from({ length: 8 }, (_, i) => ({
                 name: `Player ${i + 1}`,
               })),
             })
           }}
         >
           Create League
         </button>
         <ul>
           {data?.leagues.map((league) => (
             <li key={league.id}>{league.name}</li>
           ))}
         </ul>
       </div>
     )
   }
   ```

2. **Lintチェック**
   ```bash
   bun run lint
   ```

### 📚 公式ドキュメント

**TanStack React Query v5:**
- [Overview](https://tanstack.com/query/v5/docs/framework/react/overview) - React Query の概要
- [Quick Start](https://tanstack.com/query/v5/docs/framework/react/quick-start) - クイックスタートガイド
- [Queries Guide](https://tanstack.com/query/v5/docs/framework/react/guides/queries) - クエリの詳細な使い方
- [Mutations Guide](https://tanstack.com/query/v5/docs/framework/react/guides/mutations) - ミューテーションの使い方
- [TypeScript](https://tanstack.com/query/v5/docs/framework/react/typescript) - TypeScript サポート

**実践的なガイド (2025):**
- [Complete Guide to useQuery and useMutation](https://medium.com/@mohamad-alaskari/a-complete-guide-to-usequery-and-usemutation-in-react-tanstack-query-57ce10dffb32) - 包括的なガイド
- [Mastering Mutations](https://tkdodo.eu/blog/mastering-mutations-in-react-query) - ミューテーションのベストプラクティス
- [Real-World Workflows](https://medium.com/@skyshots/bridging-react-querys-usequery-and-usemutation-for-real-world-workflows-db44adb060e2) - 実際のワークフロー例

**重要な注意点:**
- React Query v5 では React 18.0 以降が必要です
- v5 では `useQuery` のコールバック（`onSuccess`, `onError`）が削除されました。代わりに `useMutation` のコールバックを使用してください
- キャッシュ管理には `queryClient.invalidateQueries` または `queryClient.setQueryData` を使用します

---

## オプション: React Query DevToolsのセットアップ

開発中にキャッシュの状態を可視化したい場合は、React Query DevToolsを設定します。

### ファイル1: `app/providers.tsx`

まず、クライアントコンポーネントとしてプロバイダーを作成します。

```tsx
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1分
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

### ファイル2: `app/layout.tsx`

次に、ルートレイアウトからプロバイダーを使用します（サーバーコンポーネントのまま）。

```tsx
import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Kojiro Mahjong App',
  description: 'Mahjong league management application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**ポイント:**
- `app/providers.tsx` をクライアントコンポーネント（`'use client'`）として作成
- `app/layout.tsx` はサーバーコンポーネントのままで、`Providers` をラップするだけ
- `QueryClient` はクライアントコンポーネント内で `useState` を使って1度だけ初期化
- `staleTime` でキャッシュの有効期間を設定
- この構成により、Next.js App Routerの制約に準拠しつつReact Queryを使用できます

---

## ステップ4完了チェックリスト

- [ ] `@tanstack/react-query` がインストール済み
- [ ] `src/client/api.ts` でRPCクライアントを初期化
- [ ] `src/client/hooks/useLeagues.ts` でReact Query Hooksを作成
- [ ] エディタで型補完が動作することを確認
- [ ] `bun run lint` が通る
- [ ] （オプション）React Query DevToolsをセットアップ

---

## 次のステップへ

ステップ4が完了したら、以下の作業に進めます：

1. **実際のコンポーネント開発**
   - リーグ一覧ページの作成
   - リーグ作成フォームの実装
   - プレイヤー管理UIの開発

2. **プレイヤー管理フックの追加**
   - `useUpdatePlayerName` - プレイヤー名更新
   - `useUpdatePlayerRole` - プレイヤー権限変更

3. **認証フローの統合**
   - Supabase Authとの連携
   - ログイン/ログアウト処理
   - 認証トークンをAPIリクエストに含める

---

**作成日:** 2025-11-14
