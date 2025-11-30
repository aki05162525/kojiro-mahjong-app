# ランキング・個人成績表示機能の実装

**Issue**: #61
**URL**: https://github.com/aki05162525/kojiro-mahjong-app/issues/61

## 概要
リーグ全体のランキング（順位表）と、プレイヤー個人の成績詳細を表示する機能を実装する。
これにより、ユーザーは現在のリーグ状況や自分の成績を把握できるようになる。

## タスク内容

### 1. バックエンド実装
- **集計ロジックの実装 (`src/server/repositories/ranking.ts`)**:
    - `scores` テーブルからリーグIDに紐づく全スコアを集計。
    - プレイヤーごとの `totalPt` (合計ポイント) を算出。
    - ポイント順にソートして順位を決定。
    - 各プレイヤーのスタッツ算出（対局数、トップ数、ラス数、平均順位、最大スコアなど）。
- **API実装 (`src/server/routes/ranking.ts`)**:
    - `GET /api/leagues/:leagueId/ranking`: ランキング情報取得

### 2. フロントエンド実装
- **React Query Hooks (`useRanking`)**:
    - ランキングデータ取得用フック。
- **ランキング表示コンポーネント (`components/features/ranking/ranking-table.tsx`)**:
    - 順位、プレイヤー名、合計ポイント、各節の成績推移などをテーブル表示。
    - shadcn/ui の Table コンポーネントを使用。
- **リーグ詳細画面への統合**:
    - `LeagueDetail` の「順位」タブにランキング表を配置。

### 3. ドキュメント
- API仕様書の更新。

## 関連ドキュメント
- `docs/requirements.md` (集計ルール)
- `docs/todo.md`
