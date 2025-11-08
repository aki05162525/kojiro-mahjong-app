import { relations } from 'drizzle-orm'
import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { leaguesTable } from './leagues'
import { linkRequestsTable } from './link-requests'
import { scoresTable } from './scores'
import { usersTable } from './users'

export const userRoleEnum = pgEnum('user_role', ['admin', 'scorer', 'viewer'])

export const playersTable = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  leagueId: uuid('league_id')
    .notNull()
    .references(() => leaguesTable.id),
  name: varchar('name', { length: 20 }).notNull(),
  userId: uuid('user_id').references(() => usersTable.id),
  role: userRoleEnum('role'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

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
}))
