import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/src/config/env'

export function createClient() {
  const { url, anonKey } = getSupabaseConfig()
  return createBrowserClient(url, anonKey)
}
