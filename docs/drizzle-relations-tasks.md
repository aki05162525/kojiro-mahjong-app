# Drizzleリレーション定義タスクリスト

リレーションを定義すると、JOINクエリが簡単に書けるようになります。

## 準備

- [ ] `drizzle-orm` から `relations` をインポート
  ```typescript
  import { relations } from "drizzle-orm";
  ```

---

## 1. users.ts のリレーション定義

- [ ] `usersRelations` を定義
  - [ ] `createdLeagues` - many(leaguesTable) - 作成したリーグ一覧
  - [ ] `leagueMembers` - many(leagueMembersTable) - 参加しているリーグメンバーシップ
  - [ ] `players` - many(playersTable) - 紐づいているプレイヤー一覧
  - [ ] `linkRequests` - many(linkRequestsTable) - 送信した紐づけリクエスト一覧

**参考コード:**
```typescript
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdLeagues: many(leaguesTable),
  leagueMembers: many(leagueMembersTable),
  players: many(playersTable),
  linkRequests: many(linkRequestsTable),
}));
```

---

## 2. leagues.ts のリレーション定義

- [ ] `leaguesRelations` を定義
  - [ ] `creator` - one(usersTable) - リーグ作成者
  - [ ] `members` - many(leagueMembersTable) - リーグメンバー一覧
  - [ ] `players` - many(playersTable) - 参加プレイヤー一覧
  - [ ] `sessions` - many(sessionsTable) - 節一覧

**参考コード:**
```typescript
export const leaguesRelations = relations(leaguesTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [leaguesTable.createdBy],
    references: [usersTable.id],
  }),
  members: many(leagueMembersTable),
  players: many(playersTable),
  sessions: many(sessionsTable),
}));
```

---

## 3. league-members.ts のリレーション定義

- [ ] `leagueMembersRelations` を定義
  - [ ] `league` - one(leaguesTable) - 所属リーグ
  - [ ] `user` - one(usersTable) - ユーザー

**参考コード:**
```typescript
export const leagueMembersRelations = relations(leagueMembersTable, ({ one }) => ({
  league: one(leaguesTable, {
    fields: [leagueMembersTable.leagueId],
    references: [leaguesTable.id],
  }),
  user: one(usersTable, {
    fields: [leagueMembersTable.userId],
    references: [usersTable.id],
  }),
}));
```

---

## 4. players.ts のリレーション定義

- [ ] `playersRelations` を定義
  - [ ] `league` - one(leaguesTable) - 所属リーグ
  - [ ] `user` - one(usersTable) - 紐づいているユーザー（NULL許可）
  - [ ] `scores` - many(scoresTable) - 点数記録一覧
  - [ ] `linkRequests` - many(linkRequestsTable) - 紐づけリクエスト一覧

**参考コード:**
```typescript
export const playersRelations = relations(playersTable, ({ one, many }) => ({
  league: one(leaguesTable, {
    fields: [playersTable.leagueId],
    references: [leaguesTable.id],
  }),
  user: one(usersTable, {
    fields: [playersTable.userId],
    references: [usersTable.id],
  }),
  scores: many(scoresTable),
  linkRequests: many(linkRequestsTable),
}));
```

---

## 5. sessions.ts のリレーション定義

- [ ] `sessionsRelations` を定義
  - [ ] `league` - one(leaguesTable) - 所属リーグ
  - [ ] `tables` - many(tablesTable) - 卓一覧

**参考コード:**
```typescript
export const sessionsRelations = relations(sessionsTable, ({ one, many }) => ({
  league: one(leaguesTable, {
    fields: [sessionsTable.leagueId],
    references: [leaguesTable.id],
  }),
  tables: many(tablesTable),
}));
```

---

## 6. tables.ts のリレーション定義

- [ ] `tablesRelations` を定義
  - [ ] `session` - one(sessionsTable) - 所属節
  - [ ] `scores` - many(scoresTable) - 点数記録一覧

**参考コード:**
```typescript
export const tablesRelations = relations(tablesTable, ({ one, many }) => ({
  session: one(sessionsTable, {
    fields: [tablesTable.sessionId],
    references: [sessionsTable.id],
  }),
  scores: many(scoresTable),
}));
```

---

## 7. scores.ts のリレーション定義

- [ ] `scoresRelations` を定義
  - [ ] `table` - one(tablesTable) - 所属卓
  - [ ] `player` - one(playersTable) - プレイヤー

**参考コード:**
```typescript
export const scoresRelations = relations(scoresTable, ({ one }) => ({
  table: one(tablesTable, {
    fields: [scoresTable.tableId],
    references: [tablesTable.id],
  }),
  player: one(playersTable, {
    fields: [scoresTable.playerId],
    references: [playersTable.id],
  }),
}));
```

---

## 8. link-requests.ts のリレーション定義

- [ ] `linkRequestsRelations` を定義
  - [ ] `player` - one(playersTable) - 対象プレイヤー
  - [ ] `user` - one(usersTable) - リクエストしたユーザー

**参考コード:**
```typescript
export const linkRequestsRelations = relations(linkRequestsTable, ({ one }) => ({
  player: one(playersTable, {
    fields: [linkRequestsTable.playerId],
    references: [playersTable.id],
  }),
  user: one(usersTable, {
    fields: [linkRequestsTable.userId],
    references: [usersTable.id],
  }),
}));
```

---

## 完了後の確認

- [ ] 各ファイルで `relations` をインポートしているか確認
- [ ] 循環参照エラーが出ていないか確認
- [ ] `bun run db:push` でエラーが出ないか確認

---

## 参考ドキュメント

- [Drizzle ORM Relations](https://orm.drizzle.team/docs/rls)
- [database-design.md](./database-design.md) - データベース設計書

---

**作成日:** 2025-11-08
