import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SessionsResponse } from '@/src/types/session'
import { apiClient } from '../api'

/**
 * リーグの節一覧を取得
 * @param leagueId - リーグID
 */
export const useLeagueSessions = (leagueId: string) => {
  return useQuery<SessionsResponse>({
    queryKey: ['leagues', leagueId, 'sessions'],
    queryFn: async () => {
      const res = await apiClient.api.leagues[':leagueId'].sessions.$get({
        param: { leagueId },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch sessions')
      }
      return await res.json()
    },
    enabled: !!leagueId,
  })
}

/**
 * セッション（節）を作成
 */
export const useCreateSession = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (leagueId: string) => {
      const res = await apiClient.api.leagues[':leagueId'].sessions.$post({
        param: { leagueId },
        json: {},
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create session')
      }
      return await res.json()
    },
    onSuccess: (_data, leagueId) => {
      // セッション一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'sessions'] })
      // リーグ詳細のキャッシュも無効化（セッション数が変わるため）
      queryClient.invalidateQueries({ queryKey: ['leagues', leagueId] })
    },
  })
}
