'use client'

import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLeagues } from '@/src/client/hooks/useLeagues'
import type { LeaguesResponse } from '@/src/types/league'
import { LeaguesList } from './leagues-list'

interface LeaguesContainerProps {
  initialData: LeaguesResponse
}

/**
 * リーグ一覧のコンテナコンポーネント（Container）
 * データ取得とロジックを担当
 */
export function LeaguesContainer({ initialData }: LeaguesContainerProps) {
  const router = useRouter()

  // React Query で初期データを使いつつ、バックグラウンドで再検証
  const { data, isLoading, error } = useLeagues({
    initialData,
    staleTime: 1000 * 60, // 1分間はキャッシュを新鮮とみなす
  })
  const leaguesData = data ?? initialData

  const handleCreateClick = () => {
    router.push('/leagues/create')
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
          <AlertDescription>リーグ一覧の取得に失敗しました: {error.message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <LeaguesList leagues={leaguesData.leagues} onCreateClick={handleCreateClick} />
}
