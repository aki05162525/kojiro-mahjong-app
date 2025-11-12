import { createClient } from '@supabase/supabase-js'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'

// ファイルのトップレベルで検証する例
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in environment variables.')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
// Context型定義（認証後のユーザー情報を保持）
export type AuthContext = {
  Variables: {
    userId: string
  }
}

// 認証ミドルウェア
export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  // Authorizationヘッダーからトークン取得
  // トークンチェックの処理
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: '認証が必要です' })
  }
  const token = authHeader.replace('Bearer ', '')
  // トークン検証
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new HTTPException(401, { message: '無効なトークンです' })
  }
  // Context にユーザーIDを設定
  c.set('userId', data.user.id)

  await next()
})
