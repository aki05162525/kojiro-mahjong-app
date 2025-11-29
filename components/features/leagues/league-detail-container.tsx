'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLeague } from '@/src/client/hooks/useLeagues'
import { LeagueDetail } from './league-detail'

interface LeagueDetailContainerProps {
  initialData: {
    id: string
    name: string
    description: string | null
    status: string
    createdAt: string
    updatedAt: string
    players: Array<{
      id: string
      name: string
      role: string | null
      createdAt: string
      updatedAt: string
    }>
  }
}

/**
 * リーグ詳細のコンテナコンポーネント（Container）
 * データ取得とロジックを担当
 */
export function LeagueDetailContainer({ initialData }: LeagueDetailContainerProps) {
  const [_isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)

  // React Query で初期データを使いつつ、バックグラウンドで再検証
  const { data, isLoading, error } = useLeague(initialData.id, {
    initialData,
    staleTime: 1000 * 60, // 1分間はキャッシュを新鮮とみなす
  })
  const leagueData = data ?? initialData

  const handleSettingsClick = () => {
    setIsSettingsDialogOpen(true)
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
      <LeagueDetail league={leagueData} onSettingsClick={handleSettingsClick} />
      {/* TODO: 設定ダイアログを追加 */}
    </>
  )
}
