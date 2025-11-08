# データベース設計書

## テーブル一覧

1. users - ユーザー
2. leagues - リーグ
3. league_members - リーグメンバー・ロール管理
4. players - プレイヤー
5. sessions - 節
6. tables - 卓
7. scores - 点数記録
8. link_requests - プレイヤーとユーザーの紐づけリクエスト

---

## 1. usersテーブル

ユーザー（アプリを操作する人）を管理するテーブル。

```
id
  型: uuid
  制約: PRIMARY KEY
  説明: ユーザーID（Supabase AuthのUIDと同じ）

email
  型: varchar(255)
  制約: NOT NULL, UNIQUE
  説明: メールアドレス

name
  型: varchar(100)
  制約: NOT NULL
  説明: ユーザー名（表示用）

created_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 作成日時

updated_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 更新日時
```

---

## 2. leaguesテーブル

リーグを管理するテーブル。

```
id
  型: uuid
  制約: PRIMARY KEY
  説明: リーグID

name
  型: varchar(100)
  制約: NOT NULL
  説明: リーグ名（例：2025年1月リーグ）

description
  型: text
  制約: NULL
  説明: リーグの説明

status
  型: enum('active', 'completed')
  制約: NOT NULL, DEFAULT 'active'
  説明: リーグのステータス（進行中/終了）

created_by
  型: uuid
  制約: NOT NULL, FOREIGN KEY (users.id)
  説明: リーグ作成者のユーザーID

created_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 作成日時

updated_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 更新日時
```

**リレーション:**
- users (1) ─────< (N) leagues

---

## 3. league_membersテーブル

リーグごとのメンバーとロールを管理するテーブル。

```
id
  型: uuid
  制約: PRIMARY KEY
  説明: ID

league_id
  型: uuid
  制約: NOT NULL, FOREIGN KEY (leagues.id)
  説明: リーグID

user_id
  型: uuid
  制約: NOT NULL, FOREIGN KEY (users.id)
  説明: ユーザーID

role
  型: enum('admin', 'scorer', 'viewer')
  制約: NOT NULL
  説明: このリーグでのロール

created_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 作成日時

updated_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 更新日時
```

**制約:**
- (league_id, user_id) で UNIQUE制約

**リレーション:**
- leagues (1) ─────< (N) league_members (N) >───── (1) users

---

## 4. playersテーブル

プレイヤー（対局参加者）を管理するテーブル。

```
id
  型: uuid
  制約: PRIMARY KEY
  説明: プレイヤーID

league_id
  型: uuid
  制約: NOT NULL, FOREIGN KEY (leagues.id)
  説明: 所属リーグID

name
  型: varchar(100)
  制約: NOT NULL
  説明: プレイヤー名（ユーザー未紐づけ時のみ使用）

user_id
  型: uuid
  制約: NULL, FOREIGN KEY (users.id)
  説明: 紐づいているユーザーID

created_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 作成日時

updated_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 更新日時
```

**表示ロジック:**
- user_id が NULL → players.name を表示
- user_id に値あり → users.name を表示（JOIN必要）

**リレーション:**
- leagues (1) ─────< (N) players
- users (1) ─────< (N) players

---

## 5. sessionsテーブル

節（対局日）を管理するテーブル。

```
id
  型: uuid
  制約: PRIMARY KEY
  説明: 節ID

league_id
  型: uuid
  制約: NOT NULL, FOREIGN KEY (leagues.id)
  説明: リーグID

session_number
  型: integer
  制約: NOT NULL
  説明: 節番号（1, 2, 3...）

created_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 作成日時

updated_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 更新日時
```

**制約:**
- (league_id, session_number) で UNIQUE制約

**リレーション:**
- leagues (1) ─────< (N) sessions

---

## 6. tablesテーブル

卓を管理するテーブル。

```
id
  型: uuid
  制約: PRIMARY KEY
  説明: 卓ID

session_id
  型: uuid
  制約: NOT NULL, FOREIGN KEY (sessions.id)
  説明: 節ID

table_number
  型: integer
  制約: NOT NULL
  説明: 卓番号（1, 2, 3, 4）

table_type
  型: enum('first', 'upper', 'lower')
  制約: NOT NULL
  説明: 卓種別（第1節/上位卓/下位卓）

created_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 作成日時

updated_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 更新日時
```

**制約:**
- (session_id, table_number) で UNIQUE制約

**table_typeの値:**
- first: 第1節
- upper: 上位卓
- lower: 下位卓

**リレーション:**
- sessions (1) ─────< (N) tables

---

## 7. scoresテーブル

点数記録を管理するテーブル。

```
id
  型: uuid
  制約: PRIMARY KEY
  説明: 点数記録ID

table_id
  型: uuid
  制約: NOT NULL, FOREIGN KEY (tables.id)
  説明: 卓ID

player_id
  型: uuid
  制約: NOT NULL, FOREIGN KEY (players.id)
  説明: プレイヤーID

wind
  型: enum('east', 'south', 'west', 'north')
  制約: NOT NULL
  説明: 座順（東南西北）

final_score
  型: integer
  制約: NOT NULL
  説明: 終了時点数

score_pt
  型: decimal(10, 1)
  制約: NOT NULL
  説明: 点数ポイント（計算値）

rank
  型: integer
  制約: NOT NULL
  説明: 順位（1-4）

rank_pt
  型: integer
  制約: NOT NULL
  説明: 順位ポイント（計算値）

total_pt
  型: decimal(10, 1)
  制約: NOT NULL
  説明: 合計ポイント（score_pt + rank_pt）

created_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 作成日時

updated_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 更新日時
```

**制約:**
- (table_id, player_id) で UNIQUE制約
- (table_id, wind) で UNIQUE制約

**計算ロジック:**
- score_pt = (final_score - 25,000) ÷ 1,000
- rank: 点数順、同点時は座順優先（east > south > west > north）
- rank_pt: 順位と table_type に応じた固定配点
- total_pt = score_pt + rank_pt

**リレーション:**
- tables (1) ─────< (N) scores (N) >───── (1) players

---

## 8. link_requestsテーブル

プレイヤーとユーザーの紐づけリクエストを管理するテーブル。

```
id
  型: uuid
  制約: PRIMARY KEY
  説明: リクエストID

player_id
  型: uuid
  制約: NOT NULL, FOREIGN KEY (players.id)
  説明: プレイヤーID

user_id
  型: uuid
  制約: NOT NULL, FOREIGN KEY (users.id)
  説明: リクエストしたユーザーID

status
  型: enum('pending', 'approved', 'rejected')
  制約: NOT NULL, DEFAULT 'pending'
  説明: リクエスト状態

created_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: リクエスト作成日時

updated_at
  型: timestamp
  制約: NOT NULL, DEFAULT NOW()
  説明: 更新日時
```

**statusの値:**
- pending: 承認待ち
- approved: 承認済み
- rejected: 却下

**リレーション:**
- users (1) ─────< (N) link_requests (N) >───── (1) players

---

## リレーション全体図

```
users (1) ─────< (N) leagues
  │                    │
  │                    └─< (N) league_members (N) >─── (1) users
  │                    │
  │                    └─< (N) players
  │                    │        │
  └─< (N) players ─────┘        │
       │                        │
       │                        └─< (N) scores (N) >─── (1) tables
       │                                                     │
       └─< (N) link_requests (N) >─── (1) users             │
                                                             │
leagues (1) ─────< (N) sessions (1) ─────< (N) tables ──────┘
```

---

**最終更新:** 2025-11-08
