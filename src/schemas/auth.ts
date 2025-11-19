import { z } from 'zod'

/**
 * 共通 Zod スキーマ定義（認証関連）
 * フロントエンド・バックエンド両方で使用可能
 */

/**
 * ログインリクエストのバリデーション
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
})

/**
 * Type Exports
 */
export type LoginInput = z.infer<typeof loginSchema>
