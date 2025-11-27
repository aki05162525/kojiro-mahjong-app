'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { SubmitHandler } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { LoginForm } from '@/components/auth/login-form'
import { useAuth } from '@/src/client/context/auth-context'
import { type LoginInput, loginSchema } from '@/src/schemas/auth'

/**
 * ログインページ（Container Component）
 * ロジック（認証、フォーム管理、ルーティング）を担当
 */
export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit: SubmitHandler<LoginInput> = async (data) => {
    setError(null)
    setLoading(true)

    try {
      const { error: authError } = await signIn(data.email, data.password)

      if (authError) {
        // セキュリティ: 一般的なエラーメッセージを使用（アカウント列挙攻撃を防ぐ）
        setError('メールアドレスまたはパスワードが正しくありません')
        return
      }

      // ログイン成功 → リーグ一覧へリダイレクト
      router.push('/leagues')
      router.refresh()
    } catch (err) {
      console.error('ログイン処理中に予期せぬエラーが発生しました:', err)
      setError('ログイン中にエラーが発生しました。しばらくしてからもう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginForm
      register={register}
      errors={errors}
      error={error}
      loading={loading}
      onSubmit={handleSubmit(onSubmit)}
    />
  )
}
