import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/src/server/supabase'
import { UserMenu } from './user-menu'

/**
 * アプリケーション共通ヘッダー（Server Component）
 * Atlassian Design System の Page Header パターンに準拠
 */
export async function PageHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--ds-neutral-200))] bg-[hsl(var(--ds-neutral-0))] shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* ロゴ・タイトル */}
          <div className="flex items-center gap-8">
            <Link
              href="/leagues"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-lg">
                小
              </div>
              <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                小次郎麻雀アプリ
              </h1>
            </Link>

            {/* デスクトップナビゲーション */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/leagues"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                リーグ一覧
              </Link>
            </nav>
          </div>

          {/* 右側メニュー */}
          <div className="flex items-center gap-4">
            {user ? (
              <UserMenu userEmail={user.email ?? 'Unknown'} />
            ) : (
              <Button asChild size="sm">
                <Link href="/login">ログイン</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
