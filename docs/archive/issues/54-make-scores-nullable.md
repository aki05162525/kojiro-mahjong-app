# DB設計変更: scoresテーブルのカラムをNullableに変更し、対局前状態を許容する

**Issue**: #54
**URL**: https://github.com/aki05162525/kojiro-mahjong-app/issues/54

## 概要
現在、`scores` テーブルの `final_score`, `score_pt`, `rank`, `rank_pt`, `total_pt` カラムはすべて `NOT NULL` 制約がついている。
しかし、要件として「節作成時に卓組と座順を確定して保存する（点数はまだ決まっていない）」必要があるため、これらのカラムを `Nullable` に変更し、対局前の状態（レコードは存在するが点数は未入力）をDB上で表現できるようにする。

## 変更内容
1. **DBスキーマ変更 (`db/schema/scores.ts`)**
    - 以下のカラムから `notNull()` を削除する。
        - `final_score`
        - `score_pt`
        - `rank`
        - `rank_pt`
        - `total_pt`
2. **マイグレーション実行**
    - `drizzle-kit generate` および `db:push` (または `db:migrate`) を実施。

## 考慮事項・実装要件
- **バリデーション (Zod)**
    - **節作成時 (Create)**: 上記カラムは `null` または `optional` を許容する。
    - **スコア入力時 (Update)**: 最終的に保存する際は、上記カラムが全て値を持っていることを必須とする。
- **集計ロジック**
    - ランキング計算などの集計クエリでは、`total_pt IS NOT NULL` の条件を追加し、未実施の対局を除外するように修正する。
- **型定義**
    - TypeScriptの型定義 (`InferSelectModel` 等) が `number | null` になるため、フロントエンドや計算ロジックでの型ガード (`if (score.finalScore !== null) ...`) を適切に追加する。

## 関連Issue
- #48 (節管理機能実装) の前提タスク
