'use client'

import { useState } from 'react'
import { CreateSessionDialog } from '@/components/features/sessions/create-session-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLeague } from '@/src/client/hooks/useLeagues'
import { useLeagueSessions } from '@/src/client/hooks/useSessions'
import type { getLeagueForUser } from '@/src/server/actions/leagues'
import { LeagueDetail } from './league-detail'
import { LeagueSettingsDialog } from './league-settings-dialog'

type LeagueDetailContainerProps = {
  initialData: Awaited<ReturnType<typeof getLeagueForUser>>
  currentUserId: string
}

/**
 * リーグ詳細のコンテナコンポーネント（Container）
 * データ取得とロジックを担当
 */
export function LeagueDetailContainer({ initialData, currentUserId }: LeagueDetailContainerProps) {
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
  const [isCreateSessionDialogOpen, setIsCreateSessionDialogOpen] = useState(false)

  // React Query で初期データを使いつつ、バックグラウンドで再検証
  const { data, isLoading, error } = useLeague(initialData.id, {
    initialData,
    staleTime: 1000 * 60, // 1分間はキャッシュを新鮮とみなす
  })
  const leagueData = data ?? initialData

  // セッション一覧を取得
  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
    error: sessionsError,
  } = useLeagueSessions(initialData.id)

  const sessions = sessionsData?.sessions ?? []
  const nextSessionNumber = sessions.length + 1

  const handleSettingsClick = () => {
    setIsSettingsDialogOpen(true)
  }

  const handleCreateSessionClick = () => {
    setIsCreateSessionDialogOpen(true)
  }

  // ローディング中（初回は initialData があるので表示されない）
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
          <AlertDescription>リーグ詳細の取得に失敗しました: {error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <LeagueDetail
        league={leagueData}
        currentUserId={currentUserId}
        onSettingsClick={handleSettingsClick}
        onCreateSessionClick={handleCreateSessionClick}
        sessions={sessions}
        isSessionsLoading={isSessionsLoading}
        sessionsError={sessionsError}
      />
      <LeagueSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        league={leagueData}
      />
      <CreateSessionDialog
        open={isCreateSessionDialogOpen}
        onOpenChange={setIsCreateSessionDialogOpen}
        leagueId={leagueData.id}
        sessionNumber={nextSessionNumber}
      />
    </>
  )
}
