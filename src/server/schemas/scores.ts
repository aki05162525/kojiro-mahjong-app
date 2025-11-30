import { z } from '@hono/zod-openapi'

/**
 * スコア入力（OpenAPI 用）
 */
export const ScoreInputSchema = z
  .object({
    scoreId: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174001',
      description: 'Score ID',
    }),
    finalScore: z.number().int().min(0).max(200000).openapi({
      example: 25600,
      description: 'Final score (0-200,000)',
    }),
  })
  .openapi('ScoreInput')

/**
 * テーブルスコア更新リクエスト（OpenAPI 用）
 */
export const UpdateTableScoresRequestSchema = z
  .object({
    scores: z.array(ScoreInputSchema).length(4).openapi({
      description: '4人分のスコア（合計100,000点、すべて異なるscoreID）',
    }),
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
      return total === 100000
    },
    {
      message: '4人の合計点数は100,000点である必要があります',
    },
  )
  .openapi('UpdateTableScoresRequest')
