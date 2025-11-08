# Drizzleスキーマ定義タスクリスト

## 準備

- [ ] Drizzle ORMのインストール
  - `drizzle-orm` パッケージ
  - `drizzle-kit` パッケージ
  - `@supabase/supabase-js` パッケージ
  - PostgreSQLドライバ（`postgres` or `@neondatabase/serverless`）

- [ ] プロジェクト構成の決定
  - スキーマファイルの配置場所（例：`src/db/schema/` or `db/schema/`）
  - Drizzle設定ファイル作成（`drizzle.config.ts`）

## スキーマ定義

- [ ] `schema/users.ts` - usersテーブル
- [ ] `schema/leagues.ts` - leaguesテーブル
- [ ] `schema/league-members.ts` - league_membersテーブル
- [ ] `schema/players.ts` - playersテーブル
- [ ] `schema/sessions.ts` - sessionsテーブル
- [ ] `schema/tables.ts` - tablesテーブル
- [ ] `schema/scores.ts` - scoresテーブル
- [ ] `schema/link-requests.ts` - link_requestsテーブル
- [ ] `schema/index.ts` - 全スキーマをエクスポート

## リレーション定義

- [ ] 各テーブルのリレーション（relations）を定義
  - users ↔ leagues
  - users ↔ league_members ↔ leagues
  - leagues ↔ players
  - users ↔ players
  - leagues ↔ sessions ↔ tables
  - tables ↔ scores ↔ players
  - users ↔ link_requests ↔ players

## マイグレーション

- [ ] マイグレーションファイル生成
  - `drizzle-kit generate:pg` コマンド実行
- [ ] マイグレーションSQL確認
- [ ] （後でSupabase接続後に実行）マイグレーション適用

## ドキュメント

- [ ] スキーマ定義の実装メモ作成（必要に応じて）

---

## 推奨の進め方

1. 準備
2. スキーマ定義（1テーブルずつ）
3. リレーション定義
4. マイグレーション

---

## 参考ドキュメント

- [database-design.md](./database-design.md) - データベース設計書
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle with Supabase](https://orm.drizzle.team/docs/get-started-postgresql#supabase)

---

**作成日:** 2025-11-08
