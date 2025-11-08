import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { leaguesTable } from './leagues'
import { usersTable } from './users'

export const playersTable = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leaguesTable.id),
  name: varchar('name', { length: 20 }).notNull(),
  userId: uuid('user_id').references(() => usersTable.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
