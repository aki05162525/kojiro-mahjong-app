'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLeagues } from '@/src/client/hooks/useLeagues'

export default function LeaguesPage() {
  const router = useRouter()
  const { data, isLoading, error } = useLeagues()

  // ローディング中
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md shadow-md">
          <AlertDescription>リーグ一覧の取得に失敗しました: {error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const leagues = data?.leagues || []

  // ステータスバッジのスタイル
  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
    switch (status) {
      case 'active':
        return `${baseClasses} bg-[hsl(var(--ds-status-success-light))] text-[hsl(var(--ds-status-success))]`
      case 'completed':
        return `${baseClasses} bg-[hsl(var(--ds-neutral-100))] text-[hsl(var(--ds-neutral-600))]`
      default:
        return `${baseClasses} bg-muted text-muted-foreground`
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '進行中'
      case 'completed':
        return '完了'
      case 'deleted':
        return '削除済み'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--ds-neutral-50))]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">リーグ一覧</h1>
              <p className="mt-2 text-sm text-muted-foreground">参加中のリーグを確認できます</p>
            </div>
            <Button
              onClick={() => router.push('/leagues/create')}
              size="lg"
              className="gap-2 shadow-sm"
            >
              <Plus className="h-5 w-5" />
              新規作成
            </Button>
          </div>
        </div>

        {/* リーグ一覧 */}
        {leagues.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 rounded-full bg-muted p-3">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">リーグがありません</h3>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                最初のリーグを作成して、対局の記録を始めましょう
              </p>
              <Button onClick={() => router.push('/leagues/create')} size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                リーグを作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <Link key={league.id} href={`/leagues/${league.id}`} className="group">
                <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-xl leading-tight group-hover:text-primary transition-colors">
                        {league.name}
                      </CardTitle>
                      <span className={getStatusBadge(league.status)}>
                        {getStatusLabel(league.status)}
                      </span>
                    </div>
                    {league.description && (
                      <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                        {league.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>作成日:</span>
                        <span className="font-medium">
                          {new Date(league.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
