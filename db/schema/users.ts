import { relations } from 'drizzle-orm'
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { leaguesTable } from './leagues'
import { leagueMembersTable } from './league-members'
import { playersTable } from './players'
import { linkRequestsTable } from './link-requests'

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const usersRelations = relations(usersTable, ({ many }) => ({
  createdLeagues: many(leaguesTable),
  leagueMembers: many(leagueMembersTable),
  players: many(playersTable),
  linkRequests: many(linkRequestsTable),
}))
