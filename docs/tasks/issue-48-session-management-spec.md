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
- [ ] `src/server/schemas/sessions.ts` 作成
- [ ] `src/server/repositories/sessions.ts` 作成（DB操作）
- [ ] `src/server/services/sessions.ts` 作成（マッチングロジック）
- [ ] `src/server/routes/sessions.ts` 作成（エンドポイント定義）
- [ ] `src/server/routes/index.ts` に登録

### Phase 2: フロントエンド実装
- [ ] `src/client/hooks/useSessions.ts` 作成
- [ ] `components/features/sessions/session-list.tsx` 作成
- [ ] `components/features/sessions/create-session-dialog.tsx` 作成
- [ ] リーグ詳細画面への組み込み
