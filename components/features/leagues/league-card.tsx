import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { League } from '@/src/types/league'

interface LeagueCardProps {
  league: League
}

/**
 * リーグカードコンポーネント
 * リーグの概要情報を表示
 */
export function LeagueCard({ league }: LeagueCardProps) {
  // ステータスバッジのスタイル（Atlassian Design System準拠）
  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
    switch (status) {
      case 'active':
        // Information (Blue): 進行中の状態を表現
        return `${baseClasses} bg-[hsl(var(--ds-status-info-light))] text-[hsl(var(--ds-status-info))]`
      case 'completed':
        // Success (Green): 完了状態を表現
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
    <Link href={`/leagues/${league.id}`} className="group">
      <Card className="h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-xl leading-tight group-hover:text-primary transition-colors">
              {league.name}
            </CardTitle>
            <span className={getStatusBadge(league.status)}>{getStatusLabel(league.status)}</span>
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
  )
}
