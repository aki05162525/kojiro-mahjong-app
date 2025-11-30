/**
 * セッション（節）関連の型定義
 * API レスポンス型、エンティティ型など
 */

import type { Wind } from '@/src/schemas/sessions'

/**
 * スコア情報（プレイヤー含む）
 */
export interface SessionScore {
  id: string
  playerId: string
  wind: Wind
  finalScore: number | null
  scorePt: string | null
  rank: number | null
  rankPt: number | null
  totalPt: string | null
  player: {
    id: string
    name: string
  }
}

/**
 * 卓情報（スコア含む）
 */
export interface SessionTable {
  id: string
  sessionId: string
  tableNumber: number
  tableType: 'first' | 'upper' | 'lower'
  createdAt: string
  updatedAt: string
  scores: SessionScore[]
}

/**
 * セッション情報（卓含む）
 */
export interface Session {
  id: string
  leagueId: string
  sessionNumber: number
  createdAt: string
  updatedAt: string
  tables: SessionTable[]
}

/**
 * セッション一覧レスポンス
 */
export interface SessionsResponse {
  sessions: Session[]
}
