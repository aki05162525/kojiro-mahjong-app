import 'server-only'
import { getCurrentUser } from '@/src/server/auth'
import { getLeaguesByUserId } from '@/src/server/services/leagues'
import type { LeaguesResponse } from '@/src/types/league'

/**
 * サーバー側でリーグ一覧を取得
 * Server Component または Server Action から呼び出す
 */
export async function getLeaguesForUser(): Promise<LeaguesResponse> {
  const user = await getCurrentUser()

  if (!user) {
    return { leagues: [] }
  }

  return await getLeaguesByUserId(user.id)
}
