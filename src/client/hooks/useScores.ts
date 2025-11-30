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
      scores: UpdateTableScoresInput
    }) => {
      const res = await apiClient.api.tables[':tableId'].scores.$put({
        param: { tableId },
        json: scores,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update scores')
      }
    },
    onSuccess: () => {
      // セッション一覧を再取得（スコアが更新されたため）
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}
