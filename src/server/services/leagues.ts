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
  const league = await findLeagueAndVerifyAdmin(leagueId, userId)
  const updatedLeague = await leaguesRepo.updateLeague(leagueId, data)

  return {
    ...league,
    name: updatedLeague.name,
    description: updatedLeague.description,
    status: updatedLeague.status,
    updatedAt: updatedLeague.updatedAt,
  }
}

// リーグ削除
export async function deleteLeague(leagueId: string, userId: string) {
  await findLeagueAndVerifyAdmin(leagueId, userId)
  await leaguesRepo.deleteLeague(leagueId)
}

// ステータス変更
export async function updateLeagueStatus(
  leagueId: string,
  userId: string,
  status: 'active' | 'completed' | 'deleted',
) {
  const league = await findLeagueAndVerifyAdmin(leagueId, userId)
  const updatedLeague = await leaguesRepo.updateLeagueStatus(leagueId, status)

  return {
    ...league,
    status: updatedLeague.status,
    updatedAt: updatedLeague.updatedAt,
  }
}

// リーグを取得し、管理者権限を検証するヘルパー（他のサービスからも利用可能）
export async function findLeagueAndVerifyAdmin(leagueId: string, userId: string) {
  const league = await leaguesRepo.findLeagueById(leagueId)

  if (!league) {
    throw new NotFoundError('リーグが見つかりません')
  }
  if (!hasAdminRole(league, userId)) {
    throw new ForbiddenError('この操作を実行する権限がありません')
  }

  return league
}

// Admin権限チェックヘルパー
function hasAdminRole(
  league: { players: Array<{ userId: string | null; role: string | null }> },
  userId: string,
): boolean {
  return league.players.some((player) => player.userId === userId && player.role === 'admin')
}
