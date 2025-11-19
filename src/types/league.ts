/**
 * リーグの型定義
 * フロントエンド・バックエンド共通
 */

/**
 * リーグステータス
 */
export type LeagueStatus = 'active' | 'completed' | 'deleted'

/**
 * リーグの基本情報（サマリー）
 * リーグ一覧で使用
 */
export interface League {
  id: string
  name: string
  description: string | null
  status: LeagueStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

/**
 * リーグ一覧のレスポンス
 */
export interface LeaguesResponse {
  leagues: League[]
}

/**
 * リーグ作成のリクエスト
 */
export interface CreateLeagueRequest {
  name: string
  description?: string
  players: Array<{ name: string }>
}

/**
 * リーグ更新のリクエスト
 */
export interface UpdateLeagueRequest {
  name?: string
  description?: string
}

/**
 * リーグステータス更新のリクエスト
 */
export interface UpdateLeagueStatusRequest {
  status: LeagueStatus
}
