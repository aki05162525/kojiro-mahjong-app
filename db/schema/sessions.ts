import { relations } from 'drizzle-orm'
import { integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { leaguesTable } from './leagues'
import { tablesTable } from './tables'

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

export const sessionsRelations = relations(sessionsTable, ({ one, many }) => ({
  league: one(leaguesTable, {
    fields: [sessionsTable.leagueId],
    references: [leaguesTable.id],
  }),
  tables: many(tablesTable),
}))
