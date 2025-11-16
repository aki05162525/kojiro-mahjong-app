import { hc } from 'hono/client'
import type { AppType } from '../server/routes'
import { createClient } from './supabase'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

// 認証ヘッダーを自動で付与する fetch ラッパー
const authFetch: typeof fetch = async (input, init) => {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers = new Headers(init?.headers)

  // セッションが存在する場合、Authorization ヘッダーを追加
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  return fetch(input, {
    ...init,
    headers,
  })
}

export const apiClient = hc<AppType>(getBaseUrl(), {
  fetch: authFetch,
})
