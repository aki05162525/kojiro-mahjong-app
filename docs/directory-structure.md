# ディレクトリ構成

## 全体構成

```
/
├── app/
│   ├── (dashboard)/               # フロントエンド画面
│   └── api/[...route]/route.ts   # Next.js APIハンドラー
│
├── src/
│   ├── server/
│   │   ├── routes/                # Hono RPCアプリ（フロントエンド用）
│   │   ├── openapi/               # OpenAPIアプリ（ドキュメント用）
│   │   ├── services/              # ビジネスロジック
│   │   ├── repositories/          # データアクセス
│   │   ├── middleware/            # 認証、エラーハンドリング
│   │   └── validators/            # Zodバリデータ
│   │
│   └── client/
│       ├── api.ts                 # Hono RPCクライアント
│       └── hooks/                 # React Query hooks
│
└── db/
    ├── index.ts
    └── schema/                    # Drizzleスキーマ
```

## アーキテクチャ

### バックエンド: 3層アーキテクチャ

```
Route → Service → Repository → Database
```

### デュアルAPIシステム

| アプリ | 用途 | 技術 |
|--------|------|------|
| RPC | フロントエンド通信 | Hono + Hono RPC |
| OpenAPI | ドキュメント | OpenAPIHono + Swagger UI |

- マウント順序: RPC → OpenAPI
- サービス層は両方で共有

### フロントエンド

```
Component → React Query → Hono RPC Client → API
```

#### App Router構成（推奨）

```
app/
├── (public)/               # 非ログイン利用者向け。LPや説明ページをまとめる
├── (dashboard)/            # 認証必須のアプリケーション本体
│   ├── layout.tsx          # ダッシュボード専用UIの共有レイアウト
│   └── [feature]/page.tsx  # 機能単位のルート（例: leagus、records）
├── (auth)/login/page.tsx   # 認証系（`(auth)`ルートに集約）
├── providers.tsx           # QueryClient/Supabase/AuthなどのProvider集約
├── api/[...route]/route.ts # Next.js API。app配下で唯一サーバ側のimportを許可
└── globals.css             # 基本スタイル（必要に応じてfeature専用CSSを追加）
```

- ルートグループ `()` を使って公開/認証済みでlayoutやmiddlewareを切り替える。`(dashboard)` 配下はEdge/SSRを想定し、`generateMetadata`/`loading.tsx`などもフォルダ直下に置く。
- 状態は `app/providers.tsx` に集約して `app/layout.tsx` から包む。ここでだけSupabaseクライアントやReact Queryを初期化し、階層下では`src/client/hooks`を呼び出すようにする。

#### UI／クライアントレイヤーの整理

```
components/
├── ui/                     # shadcnベースなどのPure UI primitives
└── features/               # ドメインUI（例: leagues/LeagueList.tsx 等）を機能単位に配置

src/client/
├── api.ts                  # Hono RPCクライアントの初期化。app/から直接サーバ層をimportしないための境界
├── hooks/                  # React Query hooks（`useLeaguesQuery`等）。サーバ境界に近い層。
└── supabase.ts             # Supabase browser client
```

- `components/ui` はスタイル済みの汎用コンポーネント。ドメイン知識を持たないのでどの画面からも参照可能。
- 機能単位のUIは `components/features/<domain>/` にまとめる。Hookレイヤーを通して取得したデータを受け取り、Propsでやり取りすることで再利用性を保つ。
- `lib/` には完全に副作用のないユーティリティ（フォーマッタ、計算）を置く。フロント専用の関数でもポータブルに保ち、`src/server` を import しない。
- サーバとの通信や`React Query`のkeyは `src/client/hooks` 内に閉じ込めて `app/(dashboard)/**` からは `useLeaguesQuery()` 等を直接呼び出すだけにする。

- Supabase関連：ブラウザクライアントは `src/client/supabase.ts`、サーバサイドは `supabase/` 以下に分離。`app/(auth)` のフォームや`middleware.ts`からは`src/client`経由でのみ参照して境界を明示する。

---

**参照:** [hono-coding-guidelines.md](./hono-coding-guidelines.md)
