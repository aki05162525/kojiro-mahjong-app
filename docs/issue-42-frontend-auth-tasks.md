# Issue 42: フロントエンド認証画面の実装 - タスクファイル

このタスクでは、Supabase Auth を使ったログイン画面を実装し、フロントエンドから型安全に API を呼び出せるようにします。

**目標:**
- ブラウザからログイン→型安全な API 呼び出しができる
- Supabase セッションを管理し、API リクエストに自動で認証ヘッダーを付与
- 開発者が実際のユーザーコンテキストでアプリを検証できる

---

## タスク1: 環境変数の設定

### ファイル: `.env.local`

### 実装内容

Supabase の認証情報を環境変数として設定します。

### 実装手順

1. プロジェクトルートに `.env.local` ファイルを作成
2. Supabase プロジェクトの認証情報を記載

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 実装のポイント

1. **環境変数の取得方法**
   - Supabase ダッシュボード → Project Settings → API から取得
   - `NEXT_PUBLIC_` プレフィックスは必須（クライアントサイドで使用するため）

2. **セキュリティ**
   - `.env.local` は `.gitignore` に含まれているため Git にコミットされない
   - `ANON_KEY` は公開可能な Key（RLS で保護されている）

### テスト方法

環境変数が正しく読み込まれるか確認：
```bash
# Next.js を起動して確認
bun run dev
```

### 📚 公式ドキュメント

**Supabase API 設定:**
- [Supabase: API Settings](https://supabase.com/docs/guides/api) - API キーの取得方法
- [Supabase: Environment Variables](https://supabase.com/docs/guides/getting-started/local-development#environment-variables) - 環境変数の設定

**Next.js 環境変数:**
- [Next.js: Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables) - Next.js での環境変数の扱い

**重要な注意点:**
- `NEXT_PUBLIC_` で始まる環境変数のみがブラウザで使用可能
- ローカル開発では `.env.local`、本番環境では Vercel などのプラットフォームで設定

---

## タスク2: Supabase クライアントの初期化（フロントエンド用）

### ファイル: `src/client/supabase.ts`

### 実装内容

フロントエンド（ブラウザ）で使用する Supabase クライアントを作成します。

### 必要なパッケージ

```bash
# 既にインストール済み（package.json で確認）
# @supabase/supabase-js
# @supabase/ssr
```

### 実装例

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

### 実装のポイント

1. **`createBrowserClient` の役割**
   - ブラウザ環境専用の Supabase クライアント
   - Cookie ベースのセッション管理を自動で処理
   - PKCE フロー（セキュアな認証フロー）をデフォルトで使用

2. **サーバーサイドとの違い**
   - サーバー: `createServerClient` を使用（`src/server/middleware/auth.ts` を参照）
   - クライアント: `createBrowserClient` を使用（このファイル）

3. **型安全性**
   - `!` で非 null アサーション（タスク1 で環境変数を設定済みのため）

### テスト方法

1. **ファイルが正しくインポートできるか確認**
   ```typescript
   import { createClient } from '@/src/client/supabase'
   const supabase = createClient()
   console.log(supabase) // Supabase クライアントが表示される
   ```

2. **型チェック**
   ```bash
   bun run lint
   ```

### 📚 公式ドキュメント

**Supabase SSR Package:**
- [Supabase: Creating a Client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) - クライアント作成の公式ガイド
- [Supabase: Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - Next.js での完全なセットアップ例
- [Supabase: Next.js Quickstart](https://supabase.com/docs/guides/auth/quickstarts/nextjs) - 最速セットアップガイド

**Migration from Auth Helpers:**
- [Supabase: Migrating to SSR from Auth Helpers](https://supabase.com/docs/guides/auth/server-side/migrating-to-ssr-from-auth-helpers) - 旧パッケージからの移行ガイド

**重要な注意点:**
- `@supabase/auth-helpers` パッケージは非推奨。`@supabase/ssr` を使用すること
- `createBrowserClient` はクライアントコンポーネント専用
- 環境変数は必ず `NEXT_PUBLIC_` で始めること

---

## タスク3: React Query Provider のセットアップ

### ファイル1: `app/providers.tsx`

### 実装内容

React Query の `QueryClientProvider` をセットアップします。

### 必要なパッケージ

```bash
# 既にインストール済み（package.json で確認）
# @tanstack/react-query: ^5.90.9
# @tanstack/react-query-devtools: ^5.90.2
```

### 実装例

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
            staleTime: 60 * 1000, // 1分間はキャッシュを「新鮮」として扱う
            refetchOnWindowFocus: false, // ウィンドウフォーカス時に自動再取得しない
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

### 実装内容

ルートレイアウトに `Providers` を追加します。

### 実装例

```tsx
import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Kojiro Mahjong App',
  description: 'Mahjong league management application',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### 実装のポイント

1. **`'use client'` ディレクティブ**
   - `app/providers.tsx` は必ずクライアントコンポーネントにする
   - `app/layout.tsx` はサーバーコンポーネントのままでOK

2. **`useState` で QueryClient を初期化**
   - コンポーネントごとに新しい `QueryClient` が作られるのを防ぐ
   - サーバーサイドレンダリング時にユーザー間でデータが共有されるのを防ぐ

3. **`defaultOptions` の設定**
   - `staleTime`: キャッシュの有効期間（1分間は再取得しない）
   - `refetchOnWindowFocus`: ウィンドウフォーカス時の自動再取得を無効化

4. **React Query DevTools**
   - 開発中にキャッシュの状態を可視化できる
   - 本番ビルドでは自動的に除外される

### テスト方法

1. **開発サーバーを起動**
   ```bash
   bun run dev
   ```

2. **DevTools を確認**
   - ブラウザで `http://localhost:3000` にアクセス
   - 画面右下に React Query のアイコンが表示される

3. **Lint チェック**
   ```bash
   bun run lint
   ```

### 📚 公式ドキュメント

**TanStack React Query v5:**
- [React Query: Quick Start](https://tanstack.com/query/v5/docs/framework/react/quick-start) - 基本的なセットアップ
- [React Query: QueryClientProvider](https://tanstack.com/query/v5/docs/framework/react/reference/QueryClientProvider) - Provider の詳細
- [React Query: Advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr) - Next.js App Router での SSR ガイド

**Next.js との統合:**
- [Using React Query with Next.js App Router and Supabase](https://supabase.com/blog/react-query-nextjs-app-router-cache-helpers) - Supabase 公式ブログ
- [How to Use React Query in Next.js Client Components](https://www.franciscomoretti.com/blog/how-to-use-react-query-in-next-js-client-components) - 実践ガイド

**DevTools:**
- [React Query Devtools](https://tanstack.com/query/v5/docs/framework/react/devtools) - DevTools の使い方

**重要な注意点:**
- React Query v5 では React 18.0 以降が必須
- `QueryClient` は必ず `useState` で初期化すること（SSR 対応）
- v5 では `useQuery` のコールバック（`onSuccess`, `onError`）が削除されている

---

## タスク4: ログイン画面 UI の作成

### ファイル: `app/(auth)/login/page.tsx`

### 実装内容

メールアドレスとパスワードでログインできる画面を作成します。

### 実装例

```tsx
'use client'

import { createClient } from '@/src/client/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      // ログイン成功 → ホームページにリダイレクト
      router.push('/')
      router.refresh()
    } catch (err) {
      setError('ログイン中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>ログイン</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="password">パスワード</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        {error && (
          <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px' }}
        >
          {loading ? 'ログイン中...' : 'ログイン'}
        </button>
      </form>
    </div>
  )
}
```

### 実装のポイント

1. **`signInWithPassword` メソッド**
   - Supabase Auth の標準的なメール+パスワード認証
   - 戻り値: `{ data, error }` の形式

2. **エラーハンドリング**
   - `error.message` でユーザーフレンドリーなエラーメッセージを表示
   - ローディング状態を管理してボタンを無効化

3. **リダイレクト処理**
   - ログイン成功後は `router.push('/')` でホームへ
   - `router.refresh()` でサーバーコンポーネントを再レンダリング

4. **スタイリング**
   - 簡易的なインラインスタイルを使用
   - 後で Tailwind CSS や CSS Modules に置き換え可能

### テスト方法

1. **開発サーバーを起動**
   ```bash
   bun run dev
   ```

2. **ログイン画面にアクセス**
   - `http://localhost:3000/login` にアクセス

3. **テストユーザーでログイン**
   - Supabase ダッシュボードでテストユーザーを作成
   - ログインフォームに入力してログイン

4. **エラーケースを確認**
   - 間違ったパスワードを入力してエラーメッセージを確認

### 📚 公式ドキュメント

**Supabase Auth メソッド:**
- [Supabase: signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) - メソッドの詳細
- [Supabase: Password-based Auth](https://supabase.com/docs/guides/auth/passwords) - パスワード認証の完全ガイド
- [Supabase: Auth Guide](https://supabase.com/docs/guides/auth) - 認証機能の概要

**Next.js Navigation:**
- [Next.js: useRouter](https://nextjs.org/docs/app/api-reference/functions/use-router) - App Router での useRouter
- [Next.js: Redirecting](https://nextjs.org/docs/app/building-your-application/routing/redirecting) - リダイレクトの方法

**重要な注意点:**
- デフォルトではメールアドレス確認が必要（Supabase ダッシュボードで無効化可能）
- ログイン後のセッションは Cookie に自動保存される
- エラーメッセージは英語で返ってくる（必要に応じて翻訳）

---

## タスク5: API クライアントへの認証ヘッダー自動付与

### ファイル: `src/client/api.ts`

### 実装内容

既存の Hono RPC クライアントを拡張し、リクエスト時に自動で `Authorization` ヘッダーを付与します。

### 実装例

```typescript
import { hc } from 'hono/client'
import type { AppType } from '../server/routes'
import { createClient } from './supabase'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

// 認証ヘッダーを自動で付与する fetch ラッパー
const authFetch: typeof fetch = async (input, init) => {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers = new Headers(init?.headers)

  // セッションが存在する場合、Authorization ヘッダーを追加
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  return fetch(input, {
    ...init,
    headers,
  })
}

export const apiClient = hc<AppType>(getBaseUrl(), {
  fetch: authFetch,
})
```

### 実装のポイント

1. **カスタム fetch 関数**
   - Hono Client の `fetch` オプションをカスタマイズ
   - すべてのリクエストに自動で認証ヘッダーを追加

2. **`getSession()` でトークンを取得**
   - クライアントサイドで現在のセッション情報を取得
   - `session.access_token` を `Authorization: Bearer {token}` として付与

3. **既存のヘッダーを保持**
   - `new Headers(init?.headers)` で既存ヘッダーを保持
   - `headers.set()` で Authorization ヘッダーを追加

4. **型安全性**
   - `typeof fetch` で fetch の型をそのまま利用
   - TypeScript の型推論が正しく機能する

### テスト方法

1. **ログイン後に API を呼び出す**
   ```typescript
   // コンポーネント内で
   const res = await apiClient.api.leagues.$get()
   console.log(res.status) // 200 が返ればOK
   ```

2. **DevTools で確認**
   - ブラウザの Network タブを開く
   - API リクエストの Headers に `Authorization: Bearer ...` が含まれているか確認

3. **ログアウト後に API を呼び出す**
   ```typescript
   // ログアウト後
   const res = await apiClient.api.leagues.$get()
   console.log(res.status) // 401 が返ればOK
   ```

### 📚 公式ドキュメント

**Hono RPC Client:**
- [Hono: RPC](https://hono.dev/docs/guides/rpc) - RPC の基本ガイド
- [GitHub Discussion: Hono RPC Client with interceptor](https://github.com/orgs/honojs/discussions/3222) - カスタムヘッダーの追加方法

**Supabase Session Management:**
- [Supabase: getSession](https://supabase.com/docs/reference/javascript/auth-getsession) - セッション取得の API リファレンス
- [Supabase: User Sessions](https://supabase.com/docs/guides/auth/sessions) - セッション管理の詳細

**重要な注意点:**
- `getSession()` はクライアントサイド専用（サーバーでは `getUser()` を使用）
- セッションが存在しない場合でもエラーにならないように実装
- `fetch` のカスタマイズは Hono Client の公式機能

---

## タスク6: ログアウト機能の実装

### ファイル: `app/page.tsx`（または共通ヘッダーコンポーネント）

### 実装内容

ログアウトボタンを追加し、セッションを破棄してログイン画面にリダイレクトします。

### 実装例

```tsx
'use client'

import { createClient } from '@/src/client/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    getUser()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <p>ログインしていません</p>
        <button onClick={() => router.push('/login')}>ログイン</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Kojiro Mahjong App</h1>
      <p>ようこそ、{user.email} さん</p>
      <button onClick={handleLogout}>ログアウト</button>
    </div>
  )
}
```

### 実装のポイント

1. **`signOut()` メソッド**
   - Supabase Auth のセッションを破棄
   - Cookie からトークンが削除される

2. **ユーザー情報の表示**
   - `useEffect` でログイン状態を確認
   - ログインしていない場合はログインボタンを表示

3. **リダイレクト処理**
   - ログアウト後は `/login` にリダイレクト
   - `router.refresh()` でサーバーコンポーネントを再レンダリング

### テスト方法

1. **ログイン状態で確認**
   - ログイン後、ホームページにユーザー情報が表示される
   - ログアウトボタンをクリック

2. **ログアウト後の動作確認**
   - ログイン画面にリダイレクトされる
   - もう一度ホームページにアクセスするとログインボタンが表示される

3. **DevTools で Cookie を確認**
   - Application タブ → Cookies
   - ログアウト後に認証関連の Cookie が削除されているか確認

### 📚 公式ドキュメント

**Supabase Auth:**
- [Supabase: signOut](https://supabase.com/docs/guides/auth/signout) - ログアウトの詳細
- [Supabase: JavaScript signOut API](https://supabase.com/docs/reference/javascript/auth-signout) - API リファレンス

**重要な注意点:**
- `signOut()` はデフォルトで `global` スコープ（全セッションを削除）
- `local` スコープを指定すると現在のセッションのみ削除
- ログアウト後は必ずリダイレクトすること

---

## タスク7: 動作確認と統合テスト

### 実装内容

すべてのタスクが正しく連携しているか、エンドツーエンドで確認します。

### テスト手順

1. **環境変数の確認**
   ```bash
   # .env.local が存在するか確認
   cat .env.local
   ```

2. **開発サーバーを起動**
   ```bash
   bun run dev
   ```

3. **ログイン → API 呼び出し → ログアウトの流れを確認**
   - `http://localhost:3000/login` にアクセス
   - テストユーザーでログイン
   - ホームページにリダイレクトされる
   - ブラウザの Console で API を呼び出してみる:
     ```javascript
     // DevTools Console で実行
     const { apiClient } = await import('/src/client/api.ts')
     const res = await apiClient.api.leagues.$get()
     const data = await res.json()
     console.log(data) // リーグ一覧が表示される
     ```
   - ログアウトボタンをクリック
   - ログイン画面にリダイレクトされる

4. **React Query DevTools で確認**
   - 画面右下の React Query アイコンをクリック
   - キャッシュの状態を確認

5. **エラーケースを確認**
   - ログインせずに API を呼び出す → 401 エラー
   - 間違ったパスワードでログイン → エラーメッセージ表示

6. **Lint チェック**
   ```bash
   bun run lint
   ```

### 期待される動作

- ✅ ログイン成功後、ホームページが表示される
- ✅ API リクエストに `Authorization: Bearer {token}` が自動で付与される
- ✅ API が 200 レスポンスを返す（認証成功）
- ✅ ログアウト後、ログイン画面にリダイレクトされる
- ✅ ログアウト後の API リクエストは 401 エラーを返す

### トラブルシューティング

**問題: API が 401 エラーを返す**
- 解決: `.env.local` が正しく設定されているか確認
- 解決: ログインが成功しているか確認
- 解決: `Authorization` ヘッダーが付与されているか DevTools で確認

**問題: ログイン画面が表示されない**
- 解決: `app/(auth)/login/page.tsx` が正しく作成されているか確認
- 解決: ブラウザのキャッシュをクリア

**問題: React Query DevTools が表示されない**
- 解決: `app/providers.tsx` が正しく設定されているか確認
- 解決: `app/layout.tsx` で `<Providers>` がラップされているか確認

### 📚 公式ドキュメント

**Next.js デバッグ:**
- [Next.js: Debugging](https://nextjs.org/docs/app/building-your-application/debugging) - デバッグ方法

**Supabase トラブルシューティング:**
- [Supabase: Troubleshooting Next.js Auth Issues](https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV) - よくある問題と解決策

---

## Issue 42 完了チェックリスト

- [ ] タスク1: `.env.local` に環境変数を設定
- [ ] タスク2: `src/client/supabase.ts` を作成
- [ ] タスク3: React Query Provider をセットアップ
- [ ] タスク4: ログイン画面 UI を作成
- [ ] タスク5: API クライアントに認証ヘッダーを自動付与
- [ ] タスク6: ログアウト機能を実装
- [ ] タスク7: 動作確認と統合テスト
- [ ] `bun run lint` が通る
- [ ] ログイン → API 呼び出し → ログアウトの流れが動作する

---

## 次のステップへ

Issue 42 が完了したら、以下の作業に進めます：

1. **React Query Hooks の実装**
   - `src/client/hooks/useLeagues.ts` の実装
   - 参考: `docs/issue22-step4-frontend-integration-tasks.md`

2. **リーグ一覧ページの作成**
   - `app/(dashboard)/leagues/page.tsx` の実装
   - `useLeagues` フックを使ってデータ取得

3. **リーグ作成フォームの実装**
   - `app/(dashboard)/leagues/new/page.tsx` の実装
   - `useCreateLeague` フックを使ってリーグ作成

4. **認証ルーティングの強化**
   - ミドルウェアでログイン状態をチェック
   - 未ログイン時は自動でログイン画面にリダイレクト

---

## 参考リソース

**公式ドキュメント（全体）:**
- [Supabase Docs](https://supabase.com/docs) - Supabase 公式ドキュメント
- [TanStack Query Docs](https://tanstack.com/query/latest) - React Query 公式ドキュメント
- [Hono Docs](https://hono.dev/docs) - Hono 公式ドキュメント
- [Next.js Docs](https://nextjs.org/docs) - Next.js 公式ドキュメント

**学習リソース:**
- [Next.js + Supabase Cookie-Based Auth (2025 Guide)](https://the-shubham.medium.com/next-js-supabase-cookie-based-auth-workflow-the-best-auth-solution-2025-guide-f6738b4673c1) - 完全なチュートリアル
- [Building a Modern Fullstack App with Next.js 15.1, React Query, and Hono RPC](https://medium.com/@amit.multiqos/building-a-modern-fullstack-app-with-next-js-15-1-react-query-and-hono-rpc-8dbbe3e11c53) - 類似スタックの実装例

**プロジェクト内ドキュメント:**
- `CLAUDE.md` - プロジェクト全体のガイドライン
- `docs/directory-structure.md` - ディレクトリ構成
- `docs/issue22-step4-frontend-integration-tasks.md` - フロントエンド統合の詳細
- `docs/study/understanding-auth-middleware.md` - 認証ミドルウェアの仕組み

---

**作成日:** 2025-11-15
