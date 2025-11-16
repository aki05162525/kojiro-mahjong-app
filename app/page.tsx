'use client'

import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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

  if (!user) {
    return (
      <div style={{ padding: '20px' }}>
        <p>ログインしていません</p>
        <button type="button" onClick={() => router.push('/login')}>
          ログイン
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Kojiro Mahjong App</h1>
      <p>ようこそ、{user.email} さん</p>
      <button type="button" onClick={handleLogout}>
        ログアウト
      </button>
    </div>
  )
}
