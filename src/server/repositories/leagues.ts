import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { leaguesTable, playersTable } from '@/db/schema'

// リーグ作成（トランザクション）
export async function createLeagueWithPlayers(data: {
  name: string
  description?: string
  createdBy: string
  players: Array<{ name: string }>
}) {
  return await db.transaction(async (tx) => {
    // 1. リーグを作成
    const [league] = await tx
      .insert(leaguesTable)
      .values({
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
      })
      .returning()

    // 2. プレイヤーを作成
    const playersData = data.players.map((player, index) => ({
      leagueId: league.id,
      name: player.name,
      // 最初のプレイヤー（index: 0）を作成者として紐づけ
      userId: index === 0 ? data.createdBy : null,
      role: index === 0 ? ('admin' as const) : null,
    }))

    const players = await tx.insert(playersTable).values(playersData).returning()

    return {
      ...league,
      players,
    }
  })
}

export async function findLeaguesByUserId(userId: string) {
  return await db
    .select({
      id: leaguesTable.id,
      name: leaguesTable.name,
      description: leaguesTable.description,
      status: leaguesTable.status,
      createdBy: leaguesTable.createdBy,
      createdAt: leaguesTable.createdAt,
      updatedAt: leaguesTable.updatedAt,
    })
    .from(leaguesTable)
    .innerJoin(playersTable, eq(leaguesTable.id, playersTable.leagueId))
    .where(eq(playersTable.userId, userId))
}
