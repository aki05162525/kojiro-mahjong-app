import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { getLeagueForUser } from '@/src/server/actions/leagues'
import type { Session } from '@/src/types/session'
import { LeagueOverview } from './league-overview'
import { LeagueRankingTab } from './league-ranking-tab'
import { LeagueSessionsTab } from './league-sessions-tab'

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
        {/* シンプルなヘッダー */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <Link
              href="/leagues"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              リーグ一覧に戻る
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{league.name}</h1>
            <span className={getStatusBadge(league.status)}>{getStatusLabel(league.status)}</span>
          </div>
        </div>

        {/* タブナビゲーション */}
        <Tabs defaultValue="sessions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions">対局</TabsTrigger>
            <TabsTrigger value="ranking">順位</TabsTrigger>
            <TabsTrigger value="info">情報</TabsTrigger>
          </TabsList>

          {/* 対局タブ（メイン） */}
          <TabsContent value="sessions" className="mt-6">
            <LeagueSessionsTab
              league={league}
              currentUserId={currentUserId}
              onCreateSessionClick={onCreateSessionClick}
              sessions={sessions}
              isSessionsLoading={isSessionsLoading}
              sessionsError={sessionsError}
            />
          </TabsContent>

          {/* ランキングタブ */}
          <TabsContent value="ranking" className="mt-6">
            <LeagueRankingTab />
          </TabsContent>

          {/* 情報タブ（旧Overview） */}
          <TabsContent value="info" className="mt-6">
            <LeagueOverview
              league={league}
              currentUserId={currentUserId}
              onSettingsClick={onSettingsClick}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
