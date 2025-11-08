import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { usersTable } from './users'

export const leagueStatusEnum = pgEnum('league_status', ['active', 'completed'])

export const leaguesTable = pgTable('leagues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 20 }).notNull(),
  description: text('description'),
  status: leagueStatusEnum('status').notNull().default('active'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
