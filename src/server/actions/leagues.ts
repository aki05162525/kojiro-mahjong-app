import 'server-only'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/src/server/auth'
import { getLeagueById, getLeaguesByUserId } from '@/src/server/services/leagues'
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

/**
 * サーバー側でリーグ詳細を取得
 * Server Component または Server Action から呼び出す
 * @throws Redirects to /login if user is not authenticated
 * @throws Redirects to /leagues if league not found or access denied
 */
export async function getLeagueForUser(leagueId: string) {
  const user = await getCurrentUser()

  if (!user) {
    console.warn('[Actions] Unauthenticated access to getLeagueForUser', {
      leagueId,
      timestamp: new Date().toISOString(),
    })
    redirect('/login')
  }

  try {
    const league = await getLeagueById(leagueId, user.id)
    // Date を string に変換
    return {
      ...league,
      createdAt: league.createdAt.toISOString(),
      updatedAt: league.updatedAt.toISOString(),
      players: league.players.map((player) => ({
        ...player,
        createdAt: player.createdAt.toISOString(),
      })),
    }
  } catch (error) {
    console.error('[Actions] Failed to fetch league for user:', {
      userId: user.id,
      leagueId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
    // エラー時はリーグ一覧にリダイレクト
    redirect('/leagues')
  }
}
