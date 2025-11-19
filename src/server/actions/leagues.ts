import 'server-only'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/src/server/auth'
import { getLeaguesByUserId } from '@/src/server/services/leagues'
import type { LeaguesResponse } from '@/src/types/league'

/**
 * サーバー側でリーグ一覧を取得
 * Server Component または Server Action から呼び出す
 * @throws Redirects to /login if user is not authenticated
 */
export async function getLeaguesForUser(): Promise<LeaguesResponse> {
  const user = await getCurrentUser()

  if (!user) {
    console.warn('[Actions] Unauthenticated access to getLeaguesForUser', {
      timestamp: new Date().toISOString(),
    })
    redirect('/login')
  }

  try {
    return await getLeaguesByUserId(user.id)
  } catch (error) {
    console.error('[Actions] Failed to fetch leagues for user:', {
      userId: user.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
    // エラー時は空の配列を返す（UIでエラー表示は別途実装）
    return { leagues: [] }
  }
}
