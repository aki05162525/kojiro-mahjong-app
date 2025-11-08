import { relations } from 'drizzle-orm'
import { integer, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { scoresTable } from './scores'
import { sessionsTable } from './sessions'

// table_typeのenum定義
export const tableTypeEnum = pgEnum('table_type', ['first', 'upper', 'lower'])

export const tablesTable = pgTable(
  'tables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessionsTable.id),
    tableNumber: integer('table_number').notNull(),
    tableType: tableTypeEnum('table_type').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionTableUnique: unique().on(table.sessionId, table.tableNumber),
  }),
)

export const tablesRelations = relations(tablesTable, ({ one, many }) => ({
  session: one(sessionsTable, {
    fields: [tablesTable.sessionId],
    references: [sessionsTable.id],
  }),
  scores: many(scoresTable),
}))
