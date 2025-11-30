import type { UpdateTableScoresInput } from '@/src/schemas/scores'
import type { Wind } from '@/src/schemas/sessions'
import { BadRequestError } from '../middleware/error-handler'
import * as scoresRepository from '../repositories/scores'

/**
 * 座順の優先度（同点時のタイブレーク用）
 */
const WIND_PRIORITY: Record<Wind, number> = {
  east: 0,
  south: 1,
  west: 2,
  north: 3,
}

/**
 * テーブルタイプ別の順位ポイント配点
 */
const RANK_POINTS: Record<string, number[]> = {
  first: [40, 30, 20, 10],
  upper: [80, 70, 40, 30],
  lower: [60, 50, 20, 10],
}

/**
 * 点数ポイント計算
 */
export function calculateScorePt(finalScore: number): number {
  return (finalScore - 25000) / 1000
}

/**
 * 順位判定（同点時は座順優先）
 */
export function calculateRanks(
  scores: Array<{ scoreId: string; finalScore: number; wind: Wind }>,
): Map<string, number> {
  const sorted = [...scores].sort((a, b) => {
    // 点数で降順ソート
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore
    }
    // 同点時は座順優先（東 > 南 > 西 > 北）
    return WIND_PRIORITY[a.wind] - WIND_PRIORITY[b.wind]
  })

  const rankMap = new Map<string, number>()
  sorted.forEach((score, index) => {
    rankMap.set(score.scoreId, index + 1) // 1位, 2位, 3位, 4位
  })

  return rankMap
}

/**
 * 順位ポイント計算
 */
export function calculateRankPt(rank: number, tableType: string): number {
  const points = RANK_POINTS[tableType]
  if (!points) {
    throw new BadRequestError(`不正なテーブルタイプです: ${tableType}`)
  }
  return points[rank - 1] // rank は 1-indexed、配列は 0-indexed
}

/**
 * 合計ポイント計算
 */
export function calculateTotalPt(rankPt: number, scorePt: number): number {
  return rankPt + scorePt
}

/**
 * テーブルスコア一括更新
 */
export async function updateTableScores(tableId: string, input: UpdateTableScoresInput) {
  // 1. テーブル情報取得（tableType 必要）
  const table = await scoresRepository.findTableById(tableId)
  if (!table) {
    throw new BadRequestError('テーブルが見つかりません')
  }

  // 2. 既存スコア取得（wind 情報必要）
  const existingScores = await scoresRepository.findScoresByTableId(tableId)
  const windMap = new Map(existingScores.map((s) => [s.id, s.wind]))

  // 3. 順位計算
  const scoresWithWind = input.scores.map((s) => {
    const wind = windMap.get(s.scoreId)
    if (!wind) {
      throw new BadRequestError(`スコアIDが見つかりません: ${s.scoreId}`)
    }
    return {
      scoreId: s.scoreId,
      finalScore: s.finalScore,
      wind,
    }
  })
  const ranks = calculateRanks(scoresWithWind)

  // 4. 各スコアを計算・更新
  for (const scoreInput of input.scores) {
    const finalScore = scoreInput.finalScore
    const rank = ranks.get(scoreInput.scoreId)
    if (rank === undefined) {
      throw new BadRequestError(`順位の計算に失敗しました: ${scoreInput.scoreId}`)
    }

    const scorePt = calculateScorePt(finalScore)
    const rankPt = calculateRankPt(rank, table.tableType)
    const totalPt = calculateTotalPt(rankPt, scorePt)

    await scoresRepository.updateScore(scoreInput.scoreId, {
      finalScore,
      scorePt: scorePt.toFixed(1), // 小数点1桁
      rank,
      rankPt,
      totalPt: totalPt.toFixed(1), // 小数点1桁
    })
  }
}
