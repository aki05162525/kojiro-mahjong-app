# 節管理機能実装 (Issue #48) 実装仕様書

**Issue**: #48
**目的**: リーグ詳細画面から新しい「節（Session）」を作成し、自動卓割り当て機能によって対局の準備を行えるようにする。

## 1. 実装コンポーネント一覧

### バックエンド (Hono/RPC)
- **Schema**: `src/server/schemas/sessions.ts`
    - セッション作成/取得のリクエスト・レスポンス型定義
- **Routes**: `src/server/routes/sessions.ts`
    - `POST /api/leagues/:leagueId/sessions`: 節の作成
    - `GET /api/leagues/:leagueId/sessions`: 節一覧の取得
- **Service**: `src/server/services/sessions.ts`
    - `createSession`: マッチングロジック（ランダム/昇降級）の実装
    - `getSessions`: データ取得
- **Repository**: `src/server/repositories/sessions.ts`
    - DBアクセス（トランザクション管理含む）

### フロントエンド (React)
- **Hooks**: `src/client/hooks/useSessions.ts`
    - `useCreateSession`
    - `useLeagueSessions`
- **Components**:
    - `components/features/sessions/session-list.tsx`: 節・卓一覧表示
    - `components/features/sessions/create-session-dialog.tsx`: 作成確認
    - `app/(dashboard)/leagues/[id]/page.tsx`: 既存画面への統合

## 2. ロジック詳細

### マッチングアルゴリズム (Service層)

**A. 第1節の場合 (initial)**
1. リーグに参加している全プレイヤー（16名）を取得。
2. 配列をランダムにシャッフル。
3. 4名ずつ4つの卓 (`tables`) に割り当て。
4. 各卓内で座順 (`east`, `south`, `west`, `north`) を割り当て。
5. `tables.tableType` はすべて `first` とする（要件次第、一旦 `first`）。

**B. 第2節以降の場合 (promotion/relegation)**
*要件: 「前節の各卓で上位2名→上位卓、下位2名→下位卓」*
1. `sessionNumber - 1` のセッション情報を取得。
2. そのセッションの全卓 (`tables`) と結果 (`scores`) を取得。
3. 各卓の結果に基づき、プレイヤーを分類：
    - 各卓 1位・2位 (計8名) → **次回 上位卓** (`upper`)
    - 各卓 3位・4位 (計8名) → **次回 下位卓** (`lower`)
4. **上位卓の編成**:
    - 上位卓候補8名をランダムにシャッフルし、2つの卓 (`upper`) に割り当て。
5. **下位卓の編成**:
    - 下位卓候補8名をランダムにシャッフルし、2つの卓 (`lower`) に割り当て。

### DB保存 (Repository層)
- `sessions`, `tables`, `scores` の3テーブルへの書き込みを **1つのトランザクション** で行う。
- `scores` テーブルの `finalScore` 等は `NULL` で保存する（対局前状態）。

## 3. APIインターフェース設計

**POST /api/leagues/:leagueId/sessions**
- Request: なし（`leagueId` はパスパラメータ）
- Response:
```json
{
  "id": "session-uuid",
  "sessionNumber": 1,
  "tables": [
    {
      "id": "table-uuid",
      "tableNumber": 1,
      "tableType": "first",
      "scores": [
        { "playerId": "p1", "wind": "east", "playerName": "UserA" },
        ...
      ]
    },
    ...
  ]
}
```

**GET /api/leagues/:leagueId/sessions**
- Request: なし
- Response: `Session[]` (上記構造の配列、新しい順)

## 4. 実装手順 (TODO)

### Phase 1: バックエンド実装
- [ ] **Schema定義**: `src/server/schemas/sessions.ts`
    - ZodスキーマとOpenAPI定義を作成
- [ ] **Repository実装**: `src/server/repositories/sessions.ts`
    - `createSessionTransaction`: トランザクション内での一括作成
    - `findSessionsByLeagueId`: 関連データ（Table, Score, Player）を含めた取得
- [ ] **Service実装**: `src/server/services/sessions.ts`
    - `matchPlayers`: 第1節/第2節以降の振り分けロジック
    - `createSession`: バリデーションとトランザクション呼び出し
- [ ] **Route実装**: `src/server/routes/sessions.ts`
    - OpenAPIHonoルート定義
    - `src/server/routes/index.ts` への登録

### Phase 2: フロントエンド - ロジック実装
- [ ] **型定義**: `src/types/session.ts`
    - APIレスポンスに基づいた型定義 (RPCから推論も可だが明示的な型が必要な場合)
- [ ] **API Client**: `src/client/api.ts` (もし個別のfetch関数が必要なら)
- [ ] **React Query Hooks**: `src/client/hooks/useSessions.ts`
    - `useLeagueSessions(leagueId)`: 節一覧取得
    - `useCreateSession()`: 節作成 mutation (onSuccessでinvalidateQueries)

### Phase 3: フロントエンド - UI実装

#### 機能要件
- [ ] **リーグ詳細画面 (`app/(dashboard)/leagues/[id]/page.tsx`)**
    - **節作成ボタン**: 管理者権限を持つユーザーのみに表示される「節を作成」ボタンをページヘッダーに追加。
    - **節一覧表示**: リーグに紐づく節（Session）の一覧を表示する。各節はセッション番号、作成日を含む。
- [ ] **節作成ダイアログ (`components/features/sessions/create-session-dialog.tsx`)**
    - 「節を作成」ボタンクリック時に表示されるモーダルダイアログ。
    - 作成確認メッセージと、「作成」/「キャンセル」ボタンを持つ。
    - 「作成」ボタン押下後、API呼び出し中はローディング状態を表示し、完了したらダイアログを閉じる。
- [ ] **節詳細表示 (`components/features/sessions/session-list.tsx` 内)**
    - 各節をアコーディオン形式などで展開・格納可能にする。
    - 展開時に、その節に割り当てられた4つの卓（Table）の情報を表示する。
    - 各卓には、割り当てられた4人のプレイヤー名と座順（東南西北）を表示する。

#### 非機能要件
- [ ] **レスポンシブデザイン**: スマートフォン、タブレット、PCなど、様々なデバイスで適切に表示・操作できること。
- [ ] **ローディング表示**: API呼び出し中やデータ取得中には、ユーザーに視覚的なフィードバック（スピナーなど）を提供すること。
- [ ] **エラーハンドリング**: API呼び出しが失敗した場合、ユーザーに分かりやすいエラーメッセージを表示すること。
- [ ] **ユーザビリティ**:
    - 「節を作成」ボタンの配置は直感的であること。
    - 節一覧、卓情報の視認性が高いこと。
- [ ] **パフォーマンス**: 節一覧の描画は高速に行われ、多くの節があってもスムーズにスクロールできること。
