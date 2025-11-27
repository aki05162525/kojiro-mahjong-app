## 概要
本プルリクエストは、[Issue #44](https://github.com/aki05162525/kojiro-mahjong-app/issues/44) および [Issue #41](https://github.com/aki05162525/kojiro-mahjong-app/issues/41) に対応するものです。
主な変更点として、リーグ一覧ページの新規作成、Atlassian Design Systemに準拠したUIの全面的な改善、および認証リダイレクトパスの修正が含まれます。

## 変更点
### feat: 新機能
- リーグ一覧ページ (`/leagues`) を新規に作成し、`useLeagues` フックを用いてデータを表示するようにしました。
- 全ページ共通のグローバルヘッダーと、ログアウト機能を持つユーザーメニューを実装しました。

### refactor: リファクタリング
- リーグ一覧ページのUIを、Atlassian Design Systemのデザイントークンを活用して全面的に改善しました。
  - ステータス（進行中, 完了）を示すバッジを追加し、色をセマンティックカラーに準拠させました。
  - カードホバー時のアニメーションを追加し、視覚的なフィードバックを向上させました。
- リーグ関連の型定義を `src/types/league.ts` に集約し、コード全体の型安全性を高めました。

### fix: バグ修正
- `middleware.ts` において、認証が必要なページへのリダイレクト先を `/auth/signin` から `/login` へ修正しました。
- `useLeagues.ts` ファイル内で発生していた日本語コメントの文字化けを修正しました。

### docs: ドキュメント
- `directory-structure.md` に、App Routerベースの新しいディレクトリ構成に関する説明を追記しました。

## 関連Issue
- Closes #41
- Closes #44