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
- [x] Hono API セットアップ（RPC + OpenAPI 二重パターン）
- [x] 環境変数設定（.env.local）
- [x] 認証機能実装（Supabase Auth + JWT ミドルウェア）
  - [x] バックエンド認証ミドルウェア（`src/server/middleware/auth.ts`）
  - [x] フロントエンド認証（ログイン/ログアウト、セッション監視）
  - [x] API クライアント統合（authFetch ラッパー）

### バックエンド機能実装
- [x] **リーグ管理機能実装（100%完了）**
  - [x] Routes (RPC): GET/POST/PATCH/DELETE (`src/server/routes/leagues.ts`)
  - [x] Routes (OpenAPI): Swagger UI 対応 (`src/server/openapi/routes/leagues.ts`)
  - [x] Services: ビジネスロジック (`src/server/services/leagues.ts`)
  - [x] Repositories: Drizzle ORM アクセス層 (`src/server/repositories/leagues.ts`)
  - [x] Validators: Zod スキーマ (`src/server/validators/leagues.ts`)
  - [x] OpenAPI Schemas: 完全なスキーマ定義 (`src/server/openapi/schemas/leagues.ts`)

## 現在進行中

### プレイヤー管理機能（60%完了）
- [x] Routes (RPC): プレイヤー名更新、権限変更 (`src/server/routes/players.ts`)
- [x] Services: プレイヤー操作ロジック (`src/server/services/players.ts`)
- [x] Repositories: DB アクセス層 (`src/server/repositories/players.ts`)
- [x] Validators: playerParamSchema 等
- [ ] Routes (OpenAPI): Swagger UI 対応 ← **今ココ**
- [ ] OpenAPI Schemas: スキーマ定義
- [ ] プレイヤー削除エンドポイント追加

## TODO

### バックエンド機能実装
- [ ] **節管理機能実装（0%完了）**
  - [ ] Routes (RPC): 節の作成/取得/削除
  - [ ] Routes (OpenAPI): Swagger UI 対応
  - [ ] Services: 節番号採番、卓割り当てロジック
  - [ ] Repositories: DB アクセス層
  - [ ] Validators: Zod スキーマ
  - [ ] OpenAPI Schemas

- [ ] **表（卓）管理機能実装（0%完了）**
  - [ ] Routes (RPC): 卓の作成/取得/更新
  - [ ] Routes (OpenAPI): Swagger UI 対応
  - [ ] Services: 卓種別判定（first/upper/lower）、座順割り当て
  - [ ] Repositories: DB アクセス層
  - [ ] Validators: Zod スキーマ
  - [ ] OpenAPI Schemas

- [ ] **スコア入力・計算機能実装（0%完了）**
  - [ ] Routes (RPC): スコア入力/取得/修正
  - [ ] Routes (OpenAPI): Swagger UI 対応
  - [ ] Services: 点数計算ロジック（scorePt, rank, rankPt, totalPt）
  - [ ] Services: 同点処理（座順優先）、合計点バリデーション（100,000点）
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

### フロントエンド UI 実装
- [ ] リーグ一覧/詳細ページ
- [ ] プレイヤー管理画面
- [ ] 節作成/卓割り当て画面
- [ ] スコア入力フォーム
- [ ] ランキング表示画面
- [ ] 管理者ダッシュボード

### React Query フック作成
- [ ] useLeagues, useLeagueDetail
- [ ] usePlayers
- [ ] useSessions
- [ ] useScores
- [ ] useRanking

### テスト・リリース
- [ ] テスト実装（Jest/Vitest）
- [ ] E2E テスト（Playwright）
- [ ] デプロイ設定（Vercel）

---

**最終更新:** 2025-11-16
