import { z } from 'zod'

/**
 * 共通 Zod スキーマ定義
 * フロントエンド・バックエンド両方で使用可能
 */

// ========================================
// Enum Schemas
// ========================================

/**
 * リーグステータス
 */
export const leagueStatusSchema = z.enum(['active', 'completed', 'deleted'])

/**
 * プレイヤー権限
 */
export const playerRoleSchema = z.enum(['admin', 'scorer', 'viewer']).nullable()

// ========================================
// Player Schemas
// ========================================

/**
 * プレイヤー名のバリデーション
 */
export const playerNameSchema = z.object({
  name: z
    .string()
    .min(1, 'プレイヤー名は必須です')
    .max(20, 'プレイヤー名は20文字以内で入力してください'),
})

/**
 * プレイヤー名更新用のバリデーション
 */
export const updatePlayerNameSchema = z.object({
  name: z
    .string()
    .min(1, 'プレイヤー名は必須です')
    .max(20, 'プレイヤー名は20文字以内で入力してください'),
})

/**
 * プレイヤー権限変更用のバリデーション
 */
export const updatePlayerRoleSchema = z.object({
  role: playerRoleSchema,
})

/**
 * プレイヤーIDパラメータのバリデーション
 */
export const playerParamSchema = z.object({
  leagueId: z.string().uuid(),
  playerId: z.string().uuid(),
})

// ========================================
// League Schemas
// ========================================

/**
 * リーグ作成リクエストのバリデーション
 */
export const createLeagueSchema = z.object({
  name: z.string().min(1, 'リーグ名は必須です').max(20, 'リーグ名は20文字以内で入力してください'),
  description: z.string().optional(),
  players: z.union([z.array(playerNameSchema).length(8), z.array(playerNameSchema).length(16)]),
})

/**
 * リーグ更新リクエストのバリデーション
 */
export const updateLeagueSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  description: z.string().optional(),
})

/**
 * リーグステータス変更リクエストのバリデーション
 */
export const updateLeagueStatusSchema = z.object({
  status: leagueStatusSchema,
})

// ========================================
// Type Exports
// ========================================

export type LeagueStatus = z.infer<typeof leagueStatusSchema>
export type PlayerRole = z.infer<typeof playerRoleSchema>
export type CreateLeagueInput = z.infer<typeof createLeagueSchema>
export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>
export type UpdateLeagueStatusInput = z.infer<typeof updateLeagueStatusSchema>
export type UpdatePlayerNameInput = z.infer<typeof updatePlayerNameSchema>
export type UpdatePlayerRoleInput = z.infer<typeof updatePlayerRoleSchema>
