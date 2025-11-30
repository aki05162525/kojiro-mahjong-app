import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateTableScoresInput } from '@/src/schemas/scores'
import { apiClient } from '../api'

/**
 * スコア更新 mutation
 */
export const useUpdateScores = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tableId,
      scores,
    }: {
      tableId: string
      leagueId: string
      scores: UpdateTableScoresInput
    }) => {
      const res = await apiClient.api.tables[':tableId'].scores.$put({
        param: { tableId },
        json: scores,
      })

      if (!res.ok) {
        // エラーレスポンスはJSONボディを持つ
        try {
          const error = await res.json()
          throw new Error(error.error || 'Failed to update scores')
        } catch {
          throw new Error('Failed to update scores')
        }
      }
      // 204 No Content は正常終了（ボディなし）
    },
    onSuccess: (_data, variables) => {
      // 特定のリーグのセッション情報のみを無効化（効率的なキャッシュ更新）
      queryClient.invalidateQueries({ queryKey: ['leagues', variables.leagueId] })
    },
  })
}
