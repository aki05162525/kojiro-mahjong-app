'use client'

import { LogOut, Menu, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/src/client/supabase'

interface UserMenuProps {
  userEmail: string
}

/**
 * ユーザーメニュー（Client Component）
 * インタラクティブな部分のみをクライアントで処理
 */
export function UserMenu({ userEmail }: UserMenuProps) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  return (
    <>
      {/* デスクトップユーザーメニュー */}
      <div className="hidden md:flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{userEmail}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          ログアウト
        </Button>
      </div>

      {/* モバイルメニューボタン */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* モバイルメニュー */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 md:hidden border-t border-[hsl(var(--ds-neutral-200))] bg-[hsl(var(--ds-neutral-0))] shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <nav className="flex flex-col gap-2">
              <Link
                href="/leagues"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                リーグ一覧
              </Link>
              <div className="px-3 py-2 text-sm text-muted-foreground border-t border-[hsl(var(--ds-neutral-200))] mt-2 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" />
                  <span className="font-medium text-foreground">{userEmail}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout} className="w-full gap-2">
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </Button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
