import { z } from 'zod'

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
  players: z
    .array(playerNameSchema)
    .min(8, 'プレイヤーは8人または16人で指定してください')
    .max(16, 'プレイヤーは8人または16人で指定してください')
    .refine(
      (players) => players.length === 8 || players.length === 16,
      'プレイヤーは8人または16人で指定してください',
    ),
})
