import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from '@/db'
import { leaguesTable, playersTable } from '@/db/schema'

const notDeletedCondition = ne(leaguesTable.status, 'deleted')

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
  const subQuery = db
    .selectDistinct({ leagueId: playersTable.leagueId })
    .from(playersTable)
    .where(eq(playersTable.userId, userId))

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
    .where(and(inArray(leaguesTable.id, subQuery), notDeletedCondition))
}

// リーグ詳細取得（プレイヤー情報含む）
export async function findLeagueById(leagueId: string) {
  const league = await db.query.leaguesTable.findFirst({
    where: and(eq(leaguesTable.id, leagueId), notDeletedCondition),
    with: {
      players: {
        columns: {
          id: true,
          name: true,
          userId: true,
          role: true,
          createdAt: true,
        },
      },
    },
  })

  return league
}

// リーグ更新
export async function updateLeague(
  leagueId: string,
  data: { name?: string; description?: string },
) {
  const [updated] = await db
    .update(leaguesTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(leaguesTable.id, leagueId))
    .returning()

  return updated
}

// リーグ削除（論理削除）
export async function deleteLeague(leagueId: string) {
  await db
    .update(leaguesTable)
    .set({
      status: 'deleted',
      updatedAt: new Date(),
    })
    .where(eq(leaguesTable.id, leagueId))
}

// ステータス変更
export async function updateLeagueStatus(
  leagueId: string,
  status: 'active' | 'completed' | 'deleted',
) {
  const [updated] = await db
    .update(leaguesTable)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(leaguesTable.id, leagueId))
    .returning({
      id: leaguesTable.id,
      status: leaguesTable.status,
      updatedAt: leaguesTable.updatedAt,
    })

  return updated
}
