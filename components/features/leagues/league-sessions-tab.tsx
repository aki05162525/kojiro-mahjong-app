import { Plus } from 'lucide-react'
import { SessionList } from '@/components/features/sessions/session-list'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { getLeagueForUser } from '@/src/server/actions/leagues'
import type { Session } from '@/src/types/session'

interface LeagueSessionsTabProps {
  league: Awaited<ReturnType<typeof getLeagueForUser>>
  currentUserId: string
  onCreateSessionClick: () => void
  sessions: Session[]
  isSessionsLoading: boolean
  sessionsError: Error | null
}

export function LeagueSessionsTab({
  league,
  currentUserId,
  onCreateSessionClick,
  sessions,
  isSessionsLoading,
  sessionsError,
}: LeagueSessionsTabProps) {
  const isAdmin = league.players.some(
    (player) => player.userId === currentUserId && player.role === 'admin',
  )

  return (
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
          <AlertDescription>節一覧の取得に失敗しました: {sessionsError.message}</AlertDescription>
        </Alert>
      ) : (
        <SessionList leagueId={league.id} sessions={sessions} />
      )}
    </div>
  )
}
