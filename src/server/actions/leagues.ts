import 'server-only'
import { findLeaguesByUserId } from '@/src/server/repositories/leagues'
import { createClient } from '@/src/server/supabase'
import type { LeaguesResponse } from '@/src/types/league'

/**
 * サーバー側でリーグ一覧を取得
 * Server Component または Server Action から呼び出す
 */
export async function getLeaguesForUser(): Promise<LeaguesResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { leagues: [] }
  }

  const leagues = await findLeaguesByUserId(user.id)

  return {
    leagues: leagues.map((league) => ({
      id: league.id,
      name: league.name,
      description: league.description,
      status: league.status,
      createdBy: league.createdBy,
      createdAt: league.createdAt.toISOString(),
      updatedAt: league.updatedAt.toISOString(),
    })),
  }
}
