# スコア入力・計算機能の実装

**Issue**: #58
**URL**: https://github.com/aki05162525/kojiro-mahjong-app/issues/58

## 概要
対局（卓）ごとのスコアを入力し、自動計算ロジックに基づいてポイント（scorePt, rankPt, totalPt）を算出し、保存する機能を実装する。

## タスク内容

### 1. バックエンド実装
- **計算ロジックの実装 (`src/server/services/scores.ts`)**:
    - 素点計算: `(点数 - 25000) / 1000`
    - 順位判定: 点数順。同点の場合は座順（東>南>西>北）優先。
    - 順位点付与: 卓タイプ（First/Upper/Lower）と順位に応じたウマ・オカの加算。
    - バリデーション: 4人の合計点が100,000点であること。
- **API実装 (`src/server/routes/scores.ts`)**:
    - `PUT /api/tables/:tableId/scores`: スコア更新（入力）
- **DB更新**:
    - `scores` テーブルの各カラム (`final_score`, `rank`, `total_pt` 等) を更新。

### 2. フロントエンド実装
- **スコア入力フォーム (`components/features/scores/score-input-dialog.tsx`)**:
    - 4人分の点数入力欄。
    - リアルタイムでの合計点チェック（100,000点でないと保存不可）。
    - リアルタイムでのポイント計算プレビュー表示。
- **API連携 (`useScores`)**:
    - 更新用フックの実装。

### 3. ドキュメント
- API仕様書の更新。

## 関連ドキュメント
- `docs/requirements.md` (計算ルール)
- `docs/todo.md`
