import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/src/server/auth'

export default async function Home() {
  const user = await getCurrentUser()

  // 未ログインの場合はログインページへ
  if (!user) {
    redirect('/login')
  }

  // ログイン済みの場合はリーグ一覧へ
  redirect('/leagues')
}
