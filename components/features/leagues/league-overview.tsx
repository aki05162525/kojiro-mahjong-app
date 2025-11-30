import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { getLeagueForUser } from '@/src/server/actions/leagues'

interface LeagueOverviewProps {
  league: Awaited<ReturnType<typeof getLeagueForUser>>
  currentUserId: string
  onSettingsClick: () => void
}

export function LeagueOverview({ league, currentUserId, onSettingsClick }: LeagueOverviewProps) {
  // 管理者かどうかを判定
  const isAdmin = league.players.some(
    (player) => player.userId === currentUserId && player.role === 'admin',
  )

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
    <>
      {/* リーグ情報 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-3xl">{league.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className={getStatusBadge(league.status)}>
                    {getStatusLabel(league.status)}
                  </span>
                  {isAdmin && (
                    <Button onClick={onSettingsClick} variant="outline" size="sm" className="gap-2">
                      <Settings className="h-4 w-4" />
                      設定
                    </Button>
                  )}
                </div>
              </div>
              {league.description && (
                <CardDescription className="text-base">{league.description}</CardDescription>
              )}
            </div>
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
    </>
  )
}
