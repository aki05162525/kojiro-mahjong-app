import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { scoresTable } from '@/db/schema/scores'
import { tablesTable } from '@/db/schema/tables'

/**
 * テーブル情報を取得（tableType 含む）
 */
export async function findTableById(tableId: string) {
  const table = await db.query.tablesTable.findFirst({
    where: eq(tablesTable.id, tableId),
    columns: {
      id: true,
      tableType: true,
      sessionId: true,
    },
  })
  return table
}

/**
 * テーブルの全スコアを取得（wind 含む）
 */
export async function findScoresByTableId(tableId: string) {
  const scores = await db.query.scoresTable.findMany({
    where: eq(scoresTable.tableId, tableId),
    columns: {
      id: true,
      wind: true,
      finalScore: true,
    },
  })
  return scores
}

/**
 * スコアを更新（finalScore, scorePt, rank, rankPt, totalPt）
 */
export async function updateScore(
  scoreId: string,
  data: {
    finalScore: number
    scorePt: string
    rank: number
    rankPt: number
    totalPt: string
  },
) {
  await db
    .update(scoresTable)
    .set({
      finalScore: data.finalScore,
      scorePt: data.scorePt,
      rank: data.rank,
      rankPt: data.rankPt,
      totalPt: data.totalPt,
      updatedAt: new Date(),
    })
    .where(eq(scoresTable.id, scoreId))
}
