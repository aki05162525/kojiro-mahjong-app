import { redirect } from 'next/navigation'
import { LeagueDetailContainer } from '@/components/features/leagues/league-detail-container'
import { getLeagueForUser } from '@/src/server/actions/leagues'
import { getCurrentUser } from '@/src/server/auth'

interface LeagueDetailPageProps {
  params: Promise<{
    id: string
  }>
}

/**
 * リーグ詳細ページ（Server Component）
 * サーバー側でデータ取得してクライアントに渡す
 */
export default async function LeagueDetailPage({ params }: LeagueDetailPageProps) {
  const { id } = await params
  const initialData = await getLeagueForUser(id)

  // 現在のユーザー情報を取得
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return <LeagueDetailContainer initialData={initialData} currentUserId={user.id} />
}
