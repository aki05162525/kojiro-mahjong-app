'use client'

import { Label } from '@radix-ui/react-label'
import { KeyRound, Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// バリデーションスキーマ
const loginSchema = z.object({
  email: z.email().min(1, 'メールアドレスは必須です'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
})
// 型を取りだす
type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Inputs>()
  const onSubmit: SubmitHandler<Inputs> = (data) => console.log(data)

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
                  <Input type="email" placeholder="Email" className="pl-10 h-11" />
                </div>
              </div>

              {/* パスワード */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  パスワード
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" className="pl-10 h-11" />
                </div>
              </div>

              {/* 送信ボタン */}
              <Button type="submit" className="w-full h-11 font-medium">
                hoge
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
