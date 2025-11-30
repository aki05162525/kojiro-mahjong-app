import { z } from 'zod'

/**
 * 共通 Zod スキーマ定義 - Session (節) 関連
 * フロントエンド・バックエンド両方で使用可能
 */

// ========================================
// Enum Schemas
// ========================================

/**
 * 卓タイプ
 */
export const tableTypeSchema = z.enum(['first', 'upper', 'lower'])

/**
 * 風 (座順)
 */
export const windSchema = z.enum(['east', 'south', 'west', 'north'])

// ========================================
// Session Schemas
// ========================================

/**
 * セッション作成リクエストのバリデーション
 * leagueId はパスパラメータで渡されるため、リクエストボディには不要
 */
export const createSessionSchema = z.object({})

// ========================================
// Type Exports
// ========================================

export type TableType = z.infer<typeof tableTypeSchema>
export type Wind = z.infer<typeof windSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
