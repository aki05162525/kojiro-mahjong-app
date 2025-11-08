import { integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { leaguesTable } from './leagues'

export const sessionsTable = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leaguesTable.id),
    sessionNumber: integer('session_number').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    leagueSessionUnique: unique().on(table.leagueId, table.sessionNumber),
  }),
)
