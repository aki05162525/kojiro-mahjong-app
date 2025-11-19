import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { League } from '@/src/types/league'
import { LeagueCard } from './league-card'

interface LeaguesListProps {
  leagues: League[]
  onCreateClick: () => void
}

/**
 * リーグ一覧の表示コンポーネント（Presentational）
 * 純粋な表示ロジックのみを担当
 */
export function LeaguesList({ leagues, onCreateClick }: LeaguesListProps) {
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
            <Button onClick={onCreateClick} size="lg" className="gap-2 shadow-sm">
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
              <Button onClick={onCreateClick} size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                リーグを作成
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
