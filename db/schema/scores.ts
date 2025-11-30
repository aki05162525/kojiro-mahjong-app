import { relations } from 'drizzle-orm'
import { decimal, integer, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { playersTable } from './players'
import { tablesTable } from './tables'

// windのenum定義
export const windEnum = pgEnum('wind', ['east', 'south', 'west', 'north'])

export const scoresTable = pgTable(
  'scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tableId: uuid('table_id')
      .notNull()
      .references(() => tablesTable.id),
    playerId: uuid('player_id')
      .notNull()
      .references(() => playersTable.id),
    wind: windEnum('wind').notNull(),
    finalScore: integer('final_score'),
    scorePt: decimal('score_pt', { precision: 10, scale: 1 }),
    rank: integer('rank'),
    rankPt: integer('rank_pt'),
    totalPt: decimal('total_pt', { precision: 10, scale: 1 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    tablePlayerUnique: unique().on(table.tableId, table.playerId),
    tableWindUnique: unique().on(table.tableId, table.wind),
  }),
)

export const scoresRelations = relations(scoresTable, ({ one }) => ({
  table: one(tablesTable, {
    fields: [scoresTable.tableId],
    references: [tablesTable.id],
  }),
  player: one(playersTable, {
    fields: [scoresTable.playerId],
    references: [playersTable.id],
  }),
}))
