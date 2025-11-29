# Issue #05: データベーススキーマのリファクタリング（権限管理の統合）

## ステータス
🔴 **Open**

## 優先度
🔥 **High** - API設計に影響するため早期対応が必要

## 概要

`league_members`テーブルを削除し、`players`テーブルに`role`カラムを追加する。

## 背景

現在の設計では以下の2つのテーブルが存在する：
- `players` - リーグで麻雀を打つ人（8人または16人）
- `league_members` - リーグを運営・管理するユーザー

しかし、実際の運用では：
- **権限を持つ人（admin、scorer、viewer）は必ずプレイヤーとして参加している**
- 2つのテーブルを別々に管理するのは冗長で複雑

→ `players`テーブルに権限を統合する方がシンプルで運用に合っている

## 変更内容

### 1. スキーマ修正

#### ❌ 削除
- `db/schema/league-members.ts` ファイルを削除
- `league_members` テーブルを削除

#### ✅ 追加
`db/schema/players.ts` に `role` カラムを追加：

```typescript
export const playersTable = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id').notNull().references(() => leaguesTable.id),
  name: varchar('name', { length: 20 }).notNull(),
  userId: uuid('user_id').references(() => usersTable.id),
  role: userRoleEnum('role'),  // 追加（nullable）
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

**ルール:**
- `userId` が `null` の場合、`role` も `null`（ゲストプレイヤー）
- ユーザーと紐づいた後、権限を付与可能
- `role`: `'admin' | 'scorer' | 'viewer' | null`

#### ✅ 修正

**`db/schema/index.ts`**
```typescript
// 削除
export * from './league-members'  // ← この行を削除

// 残すもの
export * from './leagues'
export * from './link-requests'
export * from './players'
export * from './scores'
export * from './sessions'
export * from './tables'
export * from './users'
```

**`db/schema/leagues.ts` のリレーション**
```typescript
export const leaguesRelations = relations(leaguesTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [leaguesTable.createdBy],
    references: [usersTable.id],
  }),
  // members: many(leagueMembersTable),  // ← 削除
  players: many(playersTable),
  sessions: many(sessionsTable),
}))
```

**`db/schema/users.ts` のリレーション**
```typescript
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdLeagues: many(leaguesTable),
  // leagueMembers: many(leagueMembersTable),  // ← 削除
  players: many(playersTable),
  linkRequests: many(linkRequestsTable),
}))
```

### 2. マイグレーション

```bash
# スキーマ修正後
bun run db:generate

# 生成されたマイグレーションSQL確認
cat drizzle/0001_*.sql

# DBに適用
bun run db:push
```

**想定されるマイグレーション内容:**
```sql
-- league_membersテーブル削除
DROP TABLE IF EXISTS "league_members";

-- playersテーブルにroleカラム追加
ALTER TABLE "players" ADD COLUMN "role" "user_role";
```

### 3. データベース設計書の更新

`docs/database-design.md` を更新：
- `league_members` テーブルの説明を削除
- `players` テーブルに `role` カラムの説明を追加

## タスクリスト

- [ ] `db/schema/league-members.ts` を削除
- [ ] `db/schema/players.ts` に `role` カラムを追加
- [ ] `db/schema/index.ts` から `league-members` のエクスポートを削除
- [ ] `db/schema/leagues.ts` のリレーション修正
- [ ] `db/schema/users.ts` のリレーション修正
- [ ] `league_status` に `deleted` を追加（ついでに）
- [ ] マイグレーションファイル生成（`bun run db:generate`）
- [ ] マイグレーションSQL確認
- [ ] マイグレーション適用（`bun run db:push`）
- [ ] `docs/database-design.md` を更新
- [ ] `docs/api-design.md` を更新（メンバー管理API削除、プレイヤー管理API更新）

## 影響範囲

### データベース
- ✅ `league_members` テーブル削除
- ✅ `players` テーブルに `role` カラム追加
- ✅ 関連するリレーション修正

### API設計
- ❌ メンバー管理API削除
  - `POST /api/leagues/:id/members`
  - `PATCH /api/leagues/:id/members/:userId`
  - `DELETE /api/leagues/:id/members/:userId`

- ✅ プレイヤー管理APIに権限管理機能を追加
  - `PATCH /api/leagues/:id/players/:playerId/role` - 権限変更

### フロントエンド
- 今後実装時に考慮（まだ未実装）

## 検証方法

1. **スキーマ確認**
   ```bash
   # playersテーブルにroleカラムがあるか確認
   bunx supabase db dump --schema public
   ```

2. **Drizzle Studio確認**
   ```bash
   bun run db:studio
   # http://localhost:4983 でテーブル構造確認
   ```

3. **データ整合性確認**
   - リーグ作成時、プレイヤーが正しく作成されるか
   - ユーザーと紐づけ後、権限が付与できるか

## 参考資料

- [database-design.md](../database-design.md)
- [api-design.md](../api-design.md)
- [Drizzle ORM - Schema](https://orm.drizzle.team/docs/sql-schema-declaration)

---

**作成日:** 2025-11-08
**担当者:** TBD
