import { ForbiddenError, NotFoundError } from '../middleware/error-handler'
import * as leaguesRepo from '../repositories/leagues'
import * as playersRepo from '../repositories/players'

// プレイヤー名更新
export async function updatePlayerName(
  leagueId: string,
  playerId: string,
  userId: string,
  name: string,
) {
  await verifyAdminRole(leagueId, userId)
  const player = await playersRepo.updatePlayerName(leagueId, playerId, name)

  if (!player) {
    throw new NotFoundError('プレイヤーが見つかりません')
  }

  return player
}

// プレイヤー権限変更
export async function updatePlayerRole(
  leagueId: string,
  playerId: string,
  userId: string,
  role: 'admin' | 'scorer' | 'viewer' | null,
) {
  await verifyAdminRole(leagueId, userId)

  // プレイヤーがユーザーと紐づいているか確認
  const player = await playersRepo.findPlayerById(leagueId, playerId)

  if (!player) {
    throw new NotFoundError('プレイヤーが見つかりません')
  }

  if (!player.userId && role !== null) {
    throw new ForbiddenError('ユーザーと紐づいていないプレイヤーには権限を付与できません')
  }

  return await playersRepo.updatePlayerRole(leagueId, playerId, role)
}

// 管理者権限チェック
async function verifyAdminRole(leagueId: string, userId: string) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  const hasAdmin = league.players.some(
    (player) => player.userId === userId && player.role === 'admin',
  )

  if (!hasAdmin) {
    throw new ForbiddenError('この操作を実行する権限がありません')
  }
}
