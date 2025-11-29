# Issue 42: フロントエンド認証画面の実装

## 背景
- 現在は Supabase Auth のトークンを手動で取得し、API リクエストに Bearer ヘッダーを付ける必要がある。
- RPC ルートには `authMiddleware` が必須のため、UI からログインできないと実際のデータ表示や React Query の検証が進めにくい。
- フロントエンド側でセッションを管理し、ログイン済みユーザーとして `apiClient` を呼び出せる土台を整える必要がある。

## スコープ
1. Supabase Auth を使ったログイン画面（メール+パスワード想定）
2. ログイン状態の保持（クライアント側でのセッション管理）
3. API 呼び出し時に Supabase のアクセストークンを自動で Authorization ヘッダーへ付与する仕組み
4. ログアウト UI とハンドラ（最低限、セッションを破棄できること）

## アウトカム
- ブラウザからログイン→API（Hono RPC）を型安全に呼び出せるようになる。
- 開発者は React Query hooks／ページ実装を actual ユーザーコンテキストで検証できる。

## タスク例
1. Supabase クライアント初期化用ユーティリティを作成（`src/client/supabase.ts` など）
2. 認証フォーム用の UI コンポーネントを `app/(auth)/login/page.tsx` などに作成
3. ログイン成功時にセッションを保存し、`apiClient` で利用できるようフェッチラッパを整備
4. ログアウトボタンと処理の実装（セッション破棄）
5. 認証済みかどうかでルートを分岐する仕組み（必要に応じて）

## テスト
- `bun run dev` を起動し、認証画面からログイン→リーグ一覧 API (`apiClient.api.leagues.$get`) が 200 で返ること。
- ログアウト後に保護されたページへアクセスするとログイン画面へ誘導されること（任意）。

## 補足
- Supabase の URL / anon key は `.env.local` で管理。環境変数の扱いは既存の `src/server/middleware/auth.ts` を参照。
- 必要に応じて React Query の `QueryClient` に `defaultOptions` を設定しても良い。
