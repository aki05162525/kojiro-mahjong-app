import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/src/config/env'

/**
 * Server Component用のSupabaseクライアントを作成
 * cookies の読み書きが可能
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseConfig()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component内では setAll が失敗する可能性がある
          // middleware で処理されるため、ここでは無視
        }
      },
    },
  })
}
