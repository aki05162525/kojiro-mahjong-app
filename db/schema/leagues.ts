import { relations } from 'drizzle-orm'
import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { leagueMembersTable } from './league-members'
import { playersTable } from './players'
import { sessionsTable } from './sessions'
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

export const leaguesRelations = relations(leaguesTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [leaguesTable.createdBy],
    references: [usersTable.id],
  }),
  members: many(leagueMembersTable),
  players: many(playersTable),
  sessions: many(sessionsTable),
}))
