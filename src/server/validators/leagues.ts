import { z } from 'zod'

// リーグバリデーションスキーマ

// プレイヤー名のバリデーション
const playerNameSchema = z.object({
  name: z
    .string()
    .min(1, 'プレイヤー名は必須です')
    .max(20, 'プレイヤー名は20文字以内で入力してください'),
})

// リーグ作成リクエストのバリデーション
export const createLeagueSchema = z.object({
  name: z.string().min(1, 'リーグ名は必須です').max(20, 'リーグ名は20文字以内で入力してください'),
  description: z.string().optional(),
  players: z.union([z.array(playerNameSchema).length(8), z.array(playerNameSchema).length(16)]),
})
