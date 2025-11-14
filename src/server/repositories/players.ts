import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { playersTable } from '@/db/schema'

// プレイヤー名を更新
export async function updatePlayerName(
  leagueId: string,
  playerId: string,
  name: string,
) {
  const [player] = await db
    .update(playersTable)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(and(eq(playersTable.id, playerId), eq(playersTable.leagueId, leagueId)))
    .returning()

  return player
}

// プレイヤー権限を更新
export async function updatePlayerRole(
  leagueId: string,
  playerId: string,
  role: 'admin' | 'scorer' | 'viewer' | null,
) {
  const [player] = await db
    .update(playersTable)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(and(eq(playersTable.id, playerId), eq(playersTable.leagueId, leagueId)))
    .returning()

  return player
}

// プレイヤーを取得（権限チェック用）
export async function findPlayerById(leagueId: string, playerId: string) {
  return await db.query.playersTable.findFirst({
    where: and(eq(playersTable.id, playerId), eq(playersTable.leagueId, leagueId)),
  })
}
