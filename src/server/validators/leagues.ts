import { z } from '@hono/zod-openapi'

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

// リーグ更新リクエストのバリデーション
export const updateLeagueSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  description: z.string().optional(),
})

// ステータス変更リクエストのバリデーション
export const updateLeagueStatusSchema = z.object({
  status: z.enum(['active', 'completed', 'deleted']),
})

// プレイヤーID用のパラメータバリデータ
export const playerParamSchema = z.object({
  leagueId: z.string().uuid(),
  playerId: z.string().uuid(),
})

// プレイヤー名更新用のバリデータ
export const updatePlayerNameSchema = z.object({
  name: z
    .string()
    .min(1, 'プレイヤー名は必須です')
    .max(20, 'プレイヤー名は20文字以内で入力してください'),
})

// プレイヤー権限変更用のバリデータ
export const updatePlayerRoleSchema = z.object({
  role: z.enum(['admin', 'scorer', 'viewer']).nullable(),
})
