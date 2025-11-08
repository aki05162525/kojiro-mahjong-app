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
  players?: Array<{          // 任意（推奨: 16人）
    name: string             // 必須、1-20文字
  }>
}
```

**例:**
```json
{
  "name": "2025年春リーグ",
  "description": "毎週金曜日開催",
  "players": [
    { "name": "山田太郎" },
    { "name": "鈴木次郎" },
    { "name": "佐藤三郎" },
    { "name": "田中四郎" }
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
  created_by: string,
  created_at: string,        // ISO 8601形式
  updated_at: string,
  players: Array<{
    id: string,
    name: string,
    user_id: string | null,
    created_at: string
  }>
}
```

**内部処理:**
- 作成者を自動的に `league_members` に追加（role: admin）

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
    created_by: string,
    created_at: string,
    updated_at: string
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
  created_by: string,
  created_at: string,
  updated_at: string,
  players: Array<{
    id: string,
    name: string,
    user_id: string | null
  }>,
  members: Array<{
    user_id: string,
    role: 'admin' | 'scorer' | 'viewer'
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
  updated_at: string
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
  updated_at: string
}
```

---

## 今後実装予定のAPI

### プレイヤー管理
- `POST /api/leagues/:id/players` - プレイヤー追加
- `PATCH /api/leagues/:id/players/:playerId` - プレイヤー更新
- `DELETE /api/leagues/:id/players/:playerId` - プレイヤー削除

### メンバー管理
- `POST /api/leagues/:id/members` - メンバー招待
- `PATCH /api/leagues/:id/members/:userId` - 権限変更
- `DELETE /api/leagues/:id/members/:userId` - メンバー削除

### 節管理
- 対局の単位（session）のCRUD

### 卓・点数管理
- 卓（table）のCRUD
- 点数入力・計算

### ランキング
- `GET /api/leagues/:id/ranking` - ランキング取得

### プレイヤー紐づけリクエスト
- ユーザーとプレイヤーの紐づけ申請

---

## 用語の整理

### プレイヤー（players）
- リーグで**麻雀を打つ人**（通常16人）
- アプリのユーザーである必要はない
- `user_id` は null でもOK（後で紐づけ可能）

### メンバー（league_members）
- リーグを**運営・管理するユーザー**
- 必ずアプリのユーザー（`user_id` 必須）
- 権限: `admin`, `scorer`, `viewer`

---

**作成日:** 2025-11-08
**最終更新:** 2025-11-08
