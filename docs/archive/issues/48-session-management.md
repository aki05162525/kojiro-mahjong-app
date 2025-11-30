# 節管理機能実装

**Issue**: #48
**URL**: https://github.com/aki05162525/kojiro-mahjong-app/issues/48

## 概要
リーグ詳細ページから節を作成し、節一覧を表示できる機能を実装する。
バックエンドAPI（Repository/Service/Routes）からフロントエンド（UI/React Query hooks）までの完全な実装。

## 受け入れ条件

### バックエンド
- [ ] Zod スキーマが作成されている（`src/schemas/sessions.ts`）
- [ ] Repository 層が実装されている（`src/server/repositories/sessions.ts`）
- [ ] Service 層が実装されている（節番号自動採番含む）
- [ ] Routes 層が実装されている（POST/GET エンドポイント）
- [ ] OpenAPI スキーマが定義されている

### フロントエンド
- [ ] React Query hooks が作成されている（`useCreateSession`, `useLeagueSessions`）
- [ ] リーグ詳細ページが作成されている（`/leagues/[id]`）
- [ ] リーグ詳細ページヘッダーに「節を作成」ボタンが配置されている
- [ ] 節作成ダイアログが実装されている
- [ ] 節一覧が表示される
- [ ] 節作成後、一覧が自動更新される
