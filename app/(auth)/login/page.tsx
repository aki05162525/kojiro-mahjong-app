'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { SubmitHandler } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/src/client/context/auth-context'
import { type LoginInput, loginSchema } from '@/src/schemas/auth'

type LoginFormValues = LoginInput

export default function LoginPage() {
  const router = useRouter()
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-3">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">小次郎麻雀アプリ</h1>
          <p className="text-muted-foreground">成績管理</p>
        </div>

        {/* ログインカード */}
        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-foreground">ログイン</CardTitle>
            <CardDescription className="text-muted-foreground">
              メールアドレスとパスワードを入力してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* メールアドレス */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  メールアドレス
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@example.com"
                    {...register('email')}
                    className="pl-10 h-11"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* パスワード */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  パスワード
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register('password')}
                    className="pl-10 h-11"
                    disabled={loading}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* エラーメッセージ */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 送信ボタン */}
              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </form>

            {/* フッター */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-sm text-center text-muted-foreground">
                アカウントをお持ちでない方は管理者にお問い合わせください
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
