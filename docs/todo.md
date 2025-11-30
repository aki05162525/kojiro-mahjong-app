# 開発やることリスト

## 完了

- [x] ワイヤーフレーム完成
- [x] ドキュメント整備（rules.md, ai-tips, etc.）
- [x] 要件定義作成
  - [x] 機能要件
  - [x] 非機能要件
  - [x] 技術スタック確定（Next.js + Hono + Supabase + Drizzle ORM）

### 設計フェーズ
- [x] **データベース設計**
  - [x] テーブル設計（users, leagues, players, sessions, tables, scores, link_requests）
  - [x] ER図作成
  - [x] Drizzleスキーマ定義
- [x] **API設計**
  - [x] エンドポイント一覧
  - [x] リクエスト/レスポンス定義

### 環境構築
- [x] Supabaseプロジェクト作成
- [x] Drizzle ORM セットアップ
- [x] Hono API セットアップ（OpenAPI統合パターン）
- [x] 環境変数設定（.env.local）
- [x] 認証機能実装（Supabase Auth + JWT ミドルウェア）
  - [x] バックエンド認証ミドルウェア（`src/server/middleware/auth.ts`）
  - [x] フロントエンド認証（ログイン/ログアウト、セッション監視）
  - [x] API クライアント統合（authFetch ラッパー）

### バックエンド機能実装
- [x] **リーグ管理機能実装（100%完了）**
  - [x] Routes (OpenAPI統合): GET/POST/PATCH/DELETE (`src/server/routes/leagues.ts`)
  - [x] Services: ビジネスロジック (`src/server/services/leagues.ts`)
  - [x] Repositories: Drizzle ORM アクセス層 (`src/server/repositories/leagues.ts`)
  - [x] Validators: Zod スキーマ (`src/server/validators/leagues.ts`)
  - [x] OpenAPI Schemas: 完全なスキーマ定義 (`src/server/schemas/leagues.ts`)
  - [x] Swagger UI + RPC型安全性の両立

- [x] **プレイヤー管理機能（100%完了）**
  - [x] Routes (OpenAPI統合): プレイヤー名更新、権限変更 (`src/server/routes/players.ts`)
  - [x] Services: プレイヤー操作ロジック (`src/server/services/players.ts`)
  - [x] Repositories: DB アクセス層 (`src/server/repositories/players.ts`)
  - [x] OpenAPI Schemas: players用スキーマ (`src/server/schemas/players.ts`)

### フロントエンド統合
- [x] **React Query + Hono RPC 統合（100%完了）**
  - [x] RPC クライアント初期化（`src/client/api.ts`）
  - [x] 認証ヘッダー自動付与機能
  - [x] React Query Hooks 実装（`src/client/hooks/useLeagues.ts`）
    - [x] リーグ管理用 hooks（6つ）
    - [x] プレイヤー管理用 hooks（2つ）
  - [x] React Query Provider セットアップ（`app/providers.tsx`）
  - [x] React Query DevTools 統合

### 開発環境改善
- [x] **Lint/Format 最適化**
  - [x] Lefthook 設定最適化（pre-commit でチェックのみ）
  - [x] VSCode 保存時自動修正設定
  - [x] Non-null assertion 削除（db/index.ts, drizzle.config.ts）
- [x] **API アーキテクチャ改善 (#45)**
  - [x] RPC/OpenAPI ルート定義の統合（二重管理を解消）
  - [x] OpenAPIHono ベースへの統一
  - [x] スキーマ統合（`src/server/schemas/`）
  - [x] コード削減（359行→300行、約20%削減）
  - [x] Swagger UI 統合（`/api/ui`）

## 現在進行中

### バックエンド機能実装
- [ ] **スコア入力・計算機能実装（0%完了）**
  - [ ] Routes (RPC): スコア入力/取得/修正
  - [ ] Routes (OpenAPI): Swagger UI 対応
  - [ ] Services: 点数計算ロジック（scorePt, rank, rankPt, totalPt）
  - [ ] Services: 同点処理（座順優先）、合計点バリデーション（100,000点）
  - [ ] Repositories: DB アクセス層
  - [ ] Validators: Zod スキーマ
  - [ ] OpenAPI Schemas

### フロントエンド UI 実装
- [ ] **スコア入力画面**
  - [ ] スコア入力フォーム
  - [ ] リアルタイム計算表示
  - [ ] 合計点バリデーション

### React Query フック作成
- [ ] useScores (スコア入力用)

## TODO (優先度順)

### バックエンド機能実装
- [ ] **表（卓）管理機能実装（0%完了）**
  - [ ] Routes (RPC): 卓の作成/取得/更新
  - [ ] Routes (OpenAPI): Swagger UI 対応
  - [ ] Services: 卓種別判定（first/upper/lower）、座順割り当て
  - [ ] Repositories: DB アクセス層
  - [ ] Validators: Zod スキーマ
  - [ ] OpenAPI Schemas

- [ ] **ランキング表示機能実装（0%完了）**
  - [ ] Routes (RPC): リーグランキング取得、個人成績取得
  - [ ] Services: 累積ポイント計算、ソートロジック
  - [ ] Repositories: 集計クエリ

- [ ] **ユーザー管理機能実装（0%完了）**
  - [ ] Routes (RPC/OpenAPI): ユーザー一覧/詳細/作成/更新
  - [ ] Services/Repositories/Validators

- [ ] **Player-User リンク要求機能（0%完了）**
  - [ ] Routes (RPC/OpenAPI): リクエスト作成/承認/却下
  - [ ] Services/Repositories/Validators

### フロントエンド UI 実装（Next.js + shadcn/ui）
- [ ] **リーグ管理画面**
  - [ ] リーグ一覧ページ（`/leagues`）
  - [ ] リーグ作成フォーム
  - [ ] リーグ設定変更フォーム
- [ ] **プレイヤー管理画面**
  - [ ] プレイヤー一覧表示
  - [ ] プレイヤー名編集
  - [ ] 権限変更（admin/member）
- [ ] **節管理画面**
  - [ ] 卓割り当て画面
  - [ ] 座順表示
- [ ] **ランキング表示画面**
  - [ ] リーグランキング一覧
  - [ ] 個人成績詳細
- [ ] **管理者ダッシュボード**
  - [ ] リーグ統計情報
  - [ ] 最近の節一覧

### React Query フック作成
- [ ] useRanking (ランキング表示用)

### テスト・リリース
- [ ] テスト実装（Jest/Vitest）
- [ ] E2E テスト（Playwright）
- [ ] デプロイ設定（Vercel）

---

## 次のマイルストーン

### Phase 1: UI基盤構築（優先）
1. リーグ一覧/詳細ページの実装
2. リーグ作成フォームの実装
3. プレイヤー管理UIの実装

### Phase 2: 節・卓管理（中期）
1. 節管理APIの実装
2. 卓管理APIの実装
3. 卓割り当てUIの実装

### Phase 3: スコア入力・ランキング（後期）
1. スコア入力APIの実装
2. ランキング表示APIの実装
3. スコア入力UIの実装
4. ランキング表示UIの実装

---

**最終更新:** 2025-11-28
