import { cache } from 'react'
import { createClient } from './supabase'

/**
 * 現在のユーザー情報を取得（React Cache で同一リクエスト内の重複実行を防止）
 * @throws Error when authentication fails
 */
export const getCurrentUser = cache(async () => {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error('[Auth] Failed to get user:', {
        error: error.message,
        status: error.status,
        timestamp: new Date().toISOString(),
      })
      return null
    }

    if (!user) {
      console.warn('[Auth] No user session found', {
        timestamp: new Date().toISOString(),
      })
    }

    return user
  } catch (error) {
    console.error('[Auth] Unexpected error during user fetch:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
    return null
  }
})
