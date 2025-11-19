import { LeaguesContainer } from '@/components/features/leagues/leagues-container'
import { getLeaguesForUser } from '@/src/server/actions/leagues'

/**
 * リーグ一覧ページ（Server Component）
 * サーバー側でデータ取得してクライアントに渡す
 */
export default async function LeaguesPage() {
  const initialData = await getLeaguesForUser()

  return <LeaguesContainer initialData={initialData} />
}
