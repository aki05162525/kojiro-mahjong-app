# API設計書

麻雀リーグ管理アプリのAPI設計

---

## 基本仕様

### 認証
- **Supabase Auth**を使用
- フロントエンドで直接 Supabase Auth を利用
- APIは認証済みユーザー情報（JWT）を受け取る
- 🔒マークは認証必須のエンドポイント

### エラーレスポンス

すべてのエラーは以下の形式で返す：

```json
{
  "error": "ValidationError",
  "message": "nameは1-20文字で入力してください",
  "statusCode": 400
}
```

**主なステータスコード:**
- `400` - バリデーションエラー
- `401` - 認証エラー
- `403` - 権限エラー
- `404` - リソースが見つからない
- `500` - サーバーエラー

---

## リーグ管理API

### `POST /api/leagues` 🔒

新規リーグを作成

**リクエスト:**
```typescript
{
  name: string,              // 必須、1-20文字
  description?: string,      // 任意
  players: Array<{           // 必須、8人または16人
    name: string             // 必須、1-20文字
  }>
}
```

**バリデーション:**
- `players` は必須
- `players.length === 8 || players.length === 16`
- それ以外は `400 Bad Request`

**例（16人リーグ）:**
```json
{
  "name": "2025年春リーグ",
  "description": "毎週金曜日開催",
  "players": [
    { "name": "山田太郎" },
    { "name": "鈴木次郎" },
    { "name": "佐藤三郎" },
    { "name": "田中四郎" },
    { "name": "伊藤五郎" },
    { "name": "渡辺六郎" },
    { "name": "加藤七郎" },
    { "name": "中村八郎" },
    { "name": "小林九郎" },
    { "name": "吉田十郎" },
    { "name": "高橋一郎" },
    { "name": "松本二郎" },
    { "name": "木村三郎" },
    { "name": "林四郎" },
    { "name": "清水五郎" },
    { "name": "森六郎" }
  ]
}
```

**レスポンス（201 Created）:**
```typescript
{
  id: string,
  name: string,
  description: string | null,
  status: 'active' | 'completed' | 'deleted',
  createdBy: string,
  createdAt: string,        // ISO 8601形式
  updatedAt: string,
  players: Array<{
    id: string,
    leagueId: string,
    name: string,
    userId: string | null,
    role: 'admin' | 'scorer' | 'viewer' | null,
    createdAt: string,
    updatedAt: string
  }>
}
```

**内部処理:**
- リーグ作成者に対応するプレイヤーに自動的に `role: admin` を設定

---

### `GET /api/leagues` 🔒

自分が参加しているリーグ一覧を取得

**リクエスト:** なし

**レスポンス（200 OK）:**
```typescript
{
  leagues: Array<{
    id: string,
    name: string,
    description: string | null,
    status: 'active' | 'completed' | 'deleted',
    createdBy: string,
    createdAt: string,
    updatedAt: string
  }>
}
```

---

### `GET /api/leagues/:id` 🔒

リーグ詳細を取得

**リクエスト:** なし

**レスポンス（200 OK）:**
```typescript
{
  id: string,
  name: string,
  description: string | null,
  status: 'active' | 'completed' | 'deleted',
  createdBy: string,
  createdAt: string,
  updatedAt: string,
  players: Array<{
    id: string,
    name: string,
    userId: string | null,
    role: 'admin' | 'scorer' | 'viewer' | null
  }>
}
```

---

### `PATCH /api/leagues/:id` 🔒

リーグ情報を更新

**リクエスト:**
```typescript
{
  name?: string,           // 1-20文字
  description?: string
}
```

**レスポンス（200 OK）:**
```typescript
{
  id: string,
  name: string,
  description: string | null,
  status: 'active' | 'completed' | 'deleted',
  updatedAt: string
}
```

---

### `DELETE /api/leagues/:id` 🔒

リーグを削除（論理削除）

ステータスを `deleted` に変更する

**リクエスト:** なし

**レスポンス（204 No Content）**

---

### `PATCH /api/leagues/:id/status` 🔒

リーグステータスを変更

**リクエスト:**
```typescript
{
  status: 'active' | 'completed' | 'deleted'
}
```

**レスポンス（200 OK）:**
```typescript
{
  id: string,
  status: 'active' | 'completed' | 'deleted',
  updatedAt: string
}
```

---

## プレイヤー管理API

### `PATCH /api/leagues/:id/players/:playerId` 🔒

プレイヤー名を更新（表記ゆれ修正用）

**注意:**
- プレイヤーの追加・削除は不可（リーグ作成時に8人または16人で確定）
- 名前の編集のみ可能

**リクエスト:**
```typescript
{
  name: string  // 必須、1-20文字
}
```

**レスポンス（200 OK）:**
```typescript
{
  id: string,
  name: string,
  userId: string | null,
  updatedAt: string
}
```

---

### `PATCH /api/leagues/:id/players/:playerId/role` 🔒

プレイヤーの権限を変更

**権限要件:**
- リーグの管理者（role: admin）のみ実行可能

**リクエスト:**
```typescript
{
  role: 'admin' | 'scorer' | 'viewer' | null
}
```

**バリデーション:**
- プレイヤーが `userId` を持っている場合のみ権限を付与可能
- `userId` が null のプレイヤーに権限を設定しようとすると `400 Bad Request`

**レスポンス（200 OK）:**
```typescript
{
  id: string,
  name: string,
  userId: string | null,
  role: 'admin' | 'scorer' | 'viewer' | null,
  updatedAt: string
}
```

---

## 節管理API

### `POST /api/leagues/:id/sessions/next` 🔒
次の節を開始（自動生成）

**内部処理:**
- 第1節：全卓を`first`、プレイヤーをランダム割り当て
- 第2節以降：前節の結果から上位卓/下位卓を決定し、プレイヤーを割り振り

### `GET /api/leagues/:id/sessions` 🔒
節一覧を取得

### `GET /api/sessions/:sessionId` 🔒
節詳細を取得（卓情報含む）

---

## 点数管理API

### `POST /api/tables/:tableId/scores` 🔒
点数を入力

### `PATCH /api/scores/:scoreId` 🔒
点数を修正

---

## ランキングAPI

### `GET /api/leagues/:id/ranking` 🔒
リーグのランキングを取得

---

## 今後実装予定のAPI

### プレイヤー紐づけリクエスト
- ユーザーとプレイヤーの紐づけ申請・承認

---

## 用語の整理

### プレイヤー（players）
- リーグで**麻雀を打つ人**（8人または16人）
- リーグ作成時に人数確定、途中での追加・削除は不可
- アプリのユーザーである必要はない
- `userId` は null でもOK（後で紐づけ可能）
- 名前の編集のみ可能（表記ゆれ修正用）

### 権限管理（role）
- プレイヤーに権限を付与することで、リーグ運営・管理が可能
- `userId` が設定されているプレイヤーのみ権限を付与可能
- 権限の種類:
  - `admin`: リーグの管理権限（設定変更、権限付与など）
  - `scorer`: 点数入力権限
  - `viewer`: 閲覧のみ
  - `null`: 権限なし

---

**作成日:** 2025-11-08
**最終更新:** 2025-11-09
