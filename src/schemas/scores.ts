import { z } from 'zod'
import { TOTAL_SCORE } from '@/src/constants/mahjong'

/**
 * スコア入力データ（単一プレイヤー）
 */
export const scoreInputSchema = z.object({
  scoreId: z.string().uuid(),
  finalScore: z.number().int().min(0).max(200000),
})

/**
 * テーブルスコア更新リクエスト
 */
export const updateTableScoresSchema = z
  .object({
    scores: z.array(scoreInputSchema).length(4),
  })
  .refine(
    (data) => {
      const scoreIds = data.scores.map((s) => s.scoreId)
      const uniqueIds = new Set(scoreIds)
      return uniqueIds.size === 4
    },
    {
      message: 'スコアIDは4つすべて異なる必要があります',
    },
  )
  .refine(
    (data) => {
      const total = data.scores.reduce((sum, s) => sum + s.finalScore, 0)
      return total === TOTAL_SCORE
    },
    {
      message: '4人の合計点数は100,000点である必要があります',
    },
  )

export type ScoreInput = z.infer<typeof scoreInputSchema>
export type UpdateTableScoresInput = z.infer<typeof updateTableScoresSchema>
