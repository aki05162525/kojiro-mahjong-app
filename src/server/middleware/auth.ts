import { createClient } from '@supabase/supabase-js'
import { createMiddleware } from 'hono/factory'

// Supabaseクライアント初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// Context型定義（認証後のユーザー情報を保持）
export type AuthContext = {
  Variables: {
    userId: string
  }
}

// 認証ミドルウェア
export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  // Authorizationヘッダーからトークン取得
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: '認証が必要です' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')

  // トークン検証
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return c.json({ error: 'Unauthorized', message: '無効なトークンです' }, 401)
  }

  // Context にユーザーIDを設定
  c.set('userId', data.user.id)

  await next()
})
