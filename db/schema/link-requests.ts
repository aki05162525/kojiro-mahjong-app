import { pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { playersTable } from './players'
import { usersTable } from './users'

// statusのenum定義
export const linkRequestStatusEnum = pgEnum('link_request_status', [
  'pending',
  'approved',
  'rejected',
])

export const linkRequestsTable = pgTable('link_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => playersTable.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id),
  status: linkRequestStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
