import { pgTable, uuid, pgEnum, timestamp, unique } from 'drizzle-orm/pg-core'
import { leaguesTable } from './leagues'
import { usersTable } from './users'

export const userRoleEnum = pgEnum('user_role', ['admin', 'scorer', 'viewer'])

export const leagueMembersTable = pgTable(
  'league_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leaguesTable.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id),
    role: userRoleEnum('role').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    leagueUserUnique: unique().on(table.leagueId, table.userId),
  }),
)
