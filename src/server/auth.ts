import { cache } from 'react'
import { createClient } from './supabase'

/**
 * 現在のユーザー情報を取得（React Cache で同一リクエスト内の重複実行を防止）
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
