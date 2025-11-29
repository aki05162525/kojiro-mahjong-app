import { LeagueDetailContainer } from '@/components/features/leagues/league-detail-container'
import { getLeagueForUser } from '@/src/server/actions/leagues'

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

  return <LeagueDetailContainer initialData={initialData} />
}
