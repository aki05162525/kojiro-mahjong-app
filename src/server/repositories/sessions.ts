import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { playersTable, scoresTable, sessionsTable, tablesTable } from '@/db/schema'
import type { Wind } from '@/src/schemas/sessions'

/**
 * セッション作成（トランザクション）
 * sessions + tables + scores を一括作成
 */
export async function createSessionTransaction(data: {
  leagueId: string
  sessionNumber: number
  tables: Array<{
    tableNumber: number
    tableType: 'first' | 'upper' | 'lower'
    scores: Array<{
      playerId: string
      wind: Wind
    }>
  }>
}) {
  return await db.transaction(async (tx) => {
    // 1. セッションを作成
    const [session] = await tx
      .insert(sessionsTable)
      .values({
        leagueId: data.leagueId,
        sessionNumber: data.sessionNumber,
      })
      .returning()

    // 2. 各卓とスコアを作成
    const tablesWithScores = []

    for (const tableData of data.tables) {
      // 卓を作成
      const [table] = await tx
        .insert(tablesTable)
        .values({
          sessionId: session.id,
          tableNumber: tableData.tableNumber,
          tableType: tableData.tableType,
        })
        .returning()

      // スコアを作成（点数は null で保存）
      const scores = await tx
        .insert(scoresTable)
        .values(
          tableData.scores.map((score) => ({
            tableId: table.id,
            playerId: score.playerId,
            wind: score.wind,
            finalScore: null,
            scorePt: null,
            rank: null,
            rankPt: null,
            totalPt: null,
          })),
        )
        .returning()

      tablesWithScores.push({
        ...table,
        scores,
      })
    }

    return {
      ...session,
      tables: tablesWithScores,
    }
  })
}

/**
 * リーグIDで節一覧を取得（関連データ含む）
 */
export async function findSessionsByLeagueId(leagueId: string) {
  const sessions = await db.query.sessionsTable.findMany({
    where: eq(sessionsTable.leagueId, leagueId),
    orderBy: [desc(sessionsTable.sessionNumber)],
    with: {
      tables: {
        with: {
          scores: {
            with: {
              player: {
                columns: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return sessions
}

/**
 * 前節のセッション情報を取得（卓とスコア含む）
 */
export async function findPreviousSession(leagueId: string, sessionNumber: number) {
  const previousSessionNumber = sessionNumber - 1

  const session = await db.query.sessionsTable.findFirst({
    where: and(
      eq(sessionsTable.leagueId, leagueId),
      eq(sessionsTable.sessionNumber, previousSessionNumber),
    ),
    with: {
      tables: {
        with: {
          scores: {
            columns: {
              id: true,
              playerId: true,
              wind: true,
              rank: true,
            },
          },
        },
      },
    },
  })

  return session
}

/**
 * リーグIDで次のセッション番号を取得
 */
export async function getNextSessionNumber(leagueId: string): Promise<number> {
  const latestSession = await db.query.sessionsTable.findFirst({
    where: eq(sessionsTable.leagueId, leagueId),
    orderBy: [desc(sessionsTable.sessionNumber)],
    columns: {
      sessionNumber: true,
    },
  })

  return latestSession ? latestSession.sessionNumber + 1 : 1
}

/**
 * リーグの全プレイヤーを取得
 */
export async function findPlayersByLeagueId(leagueId: string) {
  const players = await db.query.playersTable.findMany({
    where: eq(playersTable.leagueId, leagueId),
    columns: {
      id: true,
      name: true,
    },
  })

  return players
}
