'use client'

import type { User } from '@supabase/supabase-js'
import { BarChart3, LogOut, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/src/client/supabase'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    // 初回セッション取得
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    getUser()

    // 認証状態変更の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // 未ログイン状態
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-3">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">ログインが必要です</CardTitle>
            <CardDescription>このページを表示するにはログインしてください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => router.push('/login')} className="w-full h-11 font-medium">
              ログインページへ
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              アカウントをお持ちでない方は管理者にお問い合わせください
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ログイン済み状態
  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
              <BarChart3 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Kojiro Mahjong App</h1>
              <p className="text-xs text-muted-foreground">麻雀リーグ管理システム</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            ログアウト
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md border-border shadow-lg">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl">ようこそ</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  )
}
