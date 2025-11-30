import { ArrowLeft, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { SessionList } from '@/components/features/sessions/session-list'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { getLeagueForUser } from '@/src/server/actions/leagues'
import type { Session } from '@/src/types/session'

interface LeagueDetailProps {
  league: Awaited<ReturnType<typeof getLeagueForUser>>
  currentUserId: string
  onSettingsClick: () => void
  onCreateSessionClick: () => void
  sessions: Session[]
  isSessionsLoading: boolean
  sessionsError: Error | null
}

/**
 * リーグ詳細の表示コンポーネント（Presentational）
 * 純粋な表示ロジックのみを担当
 */
export function LeagueDetail({
  league,
  currentUserId,
  onSettingsClick,
  onCreateSessionClick,
  sessions,
  isSessionsLoading,
  sessionsError,
}: LeagueDetailProps) {
  // 管理者かどうかを判定（現在のユーザーが管理者ロールを持つか）
  const isAdmin = league.players.some(
    (player) => player.userId === currentUserId && player.role === 'admin',
  )
  // ステータスバッジのスタイル
  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium'
    switch (status) {
      case 'active':
        return `${baseClasses} bg-[hsl(var(--ds-status-info-light))] text-[hsl(var(--ds-status-info))]`
      case 'completed':
        return `${baseClasses} bg-[hsl(var(--ds-status-success-light))] text-[hsl(var(--ds-status-success))]`
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
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/leagues"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            リーグ一覧に戻る
          </Link>
          <Button onClick={onSettingsClick} variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            設定
          </Button>
        </div>

        {/* リーグ情報 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <CardTitle className="text-3xl">{league.name}</CardTitle>
                {league.description && (
                  <CardDescription className="text-base">{league.description}</CardDescription>
                )}
              </div>
              <span className={getStatusBadge(league.status)}>{getStatusLabel(league.status)}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>作成日:</span>
                <span className="font-medium text-foreground">
                  {new Date(league.createdAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>更新日:</span>
                <span className="font-medium text-foreground">
                  {new Date(league.updatedAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* プレイヤー一覧 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>プレイヤー一覧</CardTitle>
            <CardDescription>{league.players.length}人のプレイヤー</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {league.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm"
                >
                  <span className="font-medium">{player.name}</span>
                  {player.role && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {player.role === 'admin' ? '管理者' : player.role}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 節一覧 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">節一覧</h2>
            {isAdmin && (
              <Button onClick={onCreateSessionClick} className="gap-2">
                <Plus className="h-4 w-4" />
                節を作成
              </Button>
            )}
          </div>

          {isSessionsLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex justify-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                </div>
              </CardContent>
            </Card>
          ) : sessionsError ? (
            <Alert variant="destructive">
              <AlertDescription>
                節一覧の取得に失敗しました: {sessionsError.message}
              </AlertDescription>
            </Alert>
          ) : (
            <SessionList sessions={sessions} />
          )}
        </div>
      </div>
    </div>
  )
}
