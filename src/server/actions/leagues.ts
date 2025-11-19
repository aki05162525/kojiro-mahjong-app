import 'server-only'
import { findLeaguesByUserId } from '@/src/server/repositories/leagues'
import { createClient } from '@/src/server/supabase'

/**
 * サーバー側でリーグ一覧を取得
 * Server Component または Server Action から呼び出す
 */
export async function getLeaguesForUser() {
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
      createdAt: league.createdAt.toISOString(),
    })),
  }
}
