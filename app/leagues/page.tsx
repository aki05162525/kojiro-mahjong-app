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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー表示
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>リーグ一覧の取得に失敗しました: {error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const leagues = data?.leagues || []

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">リーグ一覧</h1>
            <p className="text-muted-foreground mt-1">参加中のリーグを確認できます</p>
          </div>
          <Button onClick={() => router.push('/leagues/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </div>

        {/* リーグ一覧 */}
        {leagues.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center mb-4">まだリーグがありません</p>
              <Button onClick={() => router.push('/leagues/create')} className="gap-2">
                <Plus className="h-4 w-4" />
                最初のリーグを作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <Link key={league.id} href={`/leagues/${league.id}`}>
                <Card className="border-border hover:border-primary transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-foreground">{league.name}</CardTitle>
                    {league.description && (
                      <CardDescription className="text-muted-foreground">
                        {league.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      ステータス: <span className="font-medium">{league.status}</span>
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
