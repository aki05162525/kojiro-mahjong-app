'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/src/client/api'
import { LeaguesList } from './leagues-list'

interface League {
  id: string
  name: string
  description: string | null
  status: string
  createdAt: string
}

interface LeaguesContainerProps {
  initialData: { leagues: League[] }
}

/**
 * リーグ一覧のコンテナコンポーネント（Container）
 * データ取得とロジックを担当
 */
export function LeaguesContainer({ initialData }: LeaguesContainerProps) {
  const router = useRouter()

  // React Query で初期データを使いつつ、バックグラウンドで再検証
  const { data, isLoading, error } = useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const res = await apiClient.api.leagues.$get()
      if (!res.ok) {
        throw new Error('Failed to fetch leagues')
      }
      return await res.json()
    },
    initialData,
    staleTime: 1000 * 60, // 1分間はキャッシュを新鮮とみなす
  })

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

  return <LeaguesList leagues={data.leagues} onCreateClick={handleCreateClick} />
}
