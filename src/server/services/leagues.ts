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
