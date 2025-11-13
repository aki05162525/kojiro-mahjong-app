import { ForbiddenError, NotFoundError } from '../middleware/error-handler'
import * as leaguesRepo from '../repositories/leagues'

// リーグ作成
export async function createLeague(
  userId: string,
  data: {
    name: string
    description?: string
    players: Array<{ name: string }>
  },
) {
  return await leaguesRepo.createLeagueWithPlayers({
    ...data,
    createdBy: userId,
  })
}

// リーグ一覧取得
export async function getLeaguesByUserId(userId: string) {
  const leagues = await leaguesRepo.findLeaguesByUserId(userId)
  return { leagues }
}

// リーグ詳細取得
export async function getLeagueById(leagueId: string, userId: string) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  // ユーザーがリーグに参加しているかチェック
  const isParticipant = league.players.some((player) => player.userId === userId)
  if (!isParticipant) {
    throw new ForbiddenError('このリーグへのアクセス権限がありません')
  }

  return league
}

// リーグ更新
export async function updateLeague(
  leagueId: string,
  userId: string,
  data: { name?: string; description?: string },
) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  // Admin権限チェック
  if (!hasAdminRole(league, userId)) {
    throw new ForbiddenError('リーグを更新する権限がありません')
  }

  return await leaguesRepo.updateLeague(leagueId, data)
}

// リーグ削除
export async function deleteLeague(leagueId: string, userId: string) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  // Admin権限チェック
  if (!hasAdminRole(league, userId)) {
    throw new ForbiddenError('リーグを削除する権限がありません')
  }

  await leaguesRepo.deleteLeague(leagueId)
}

// ステータス変更
export async function updateLeagueStatus(
  leagueId: string,
  userId: string,
  status: 'active' | 'completed' | 'deleted',
) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }

  // Admin権限チェック
  if (!hasAdminRole(league, userId)) {
    throw new ForbiddenError('ステータスを変更する権限がありません')
  }

  return await leaguesRepo.updateLeagueStatus(leagueId, status)
}

// Admin権限チェックヘルパー
function hasAdminRole(
  league: { players: Array<{ userId: string | null; role: string | null }> },
  userId: string,
): boolean {
  return league.players.some((player) => player.userId === userId && player.role === 'admin')
}
