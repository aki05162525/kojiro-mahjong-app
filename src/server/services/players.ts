import { ForbiddenError, NotFoundError } from '../middleware/error-handler'
import * as playersRepo from '../repositories/players'
import * as leaguesService from '../services/leagues'

// プレイヤー名更新
export async function updatePlayerName(
  leagueId: string,
  playerId: string,
  userId: string,
  name: string,
) {
  // 管理者権限チェック（共通ヘルパーを使用）
  await leaguesService.findLeagueAndVerifyAdmin(leagueId, userId)

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
  // 管理者権限チェックとリーグ情報の取得（1回のDBクエリ）
  const league = await leaguesService.findLeagueAndVerifyAdmin(leagueId, userId)

  // リーグ情報からプレイヤーを検索（追加のDBクエリ不要）
  const playerToUpdate = league.players.find((p) => p.id === playerId)

  if (!playerToUpdate) {
    throw new NotFoundError('プレイヤーが見つかりません')
  }

  if (!playerToUpdate.userId && role !== null) {
    throw new ForbiddenError('ユーザーと紐づいていないプレイヤーには権限を付与できません')
  }

  return await playersRepo.updatePlayerRole(leagueId, playerId, role)
}
