'use client'

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/src/client/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  supabase: SupabaseClient
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    // 初回認証状態取得
    const initAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error('[Auth] Failed to get user:', error)
        }
        setUser(user)
        setLoading(false)
      } catch (error) {
        console.error('[Auth] Unexpected error:', error)
        setUser(null)
        setLoading(false)
      }
    }

    initAuth()

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[Auth] Logout failed:', error)
        return { error }
      }

      return { error: null }
    } catch (error) {
      console.error('[Auth] Unexpected error during logout:', error)
      return { error: error as Error }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, supabase, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
