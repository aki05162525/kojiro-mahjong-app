import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType } from 'hono/client'
import type { LeaguesResponse } from '@/src/types/league'
import { apiClient } from '../api'

interface UseLeaguesOptions {
  initialData?: LeaguesResponse
  staleTime?: number
}

type CreateLeagueInput = InferRequestType<(typeof apiClient.api.leagues)['$post']>['json']
type UpdateLeagueInput = InferRequestType<(typeof apiClient.api.leagues)[':id']['$patch']>['json']
type UpdateLeagueStatusInput = InferRequestType<
  (typeof apiClient.api.leagues)[':id']['status']['$patch']
>['json']
type UpdatePlayerNameInput = InferRequestType<
  (typeof apiClient.api.leagues)[':leagueId']['players'][':playerId']['$patch']
>['json']
type UpdatePlayerRoleInput = InferRequestType<
  (typeof apiClient.api.leagues)[':leagueId']['players'][':playerId']['role']['$patch']
>['json']

// ------------------------
// Query Hooks (データ取得)
// ------------------------

/**
 * リーグ一覧を取得
 */
export const useLeagues = ({ initialData, staleTime }: UseLeaguesOptions = {}) => {
  return useQuery<LeaguesResponse>({
    queryKey: ['leagues'],
    queryFn: async () => {
      const res = await apiClient.api.leagues.$get()
      if (!res.ok) {
        throw new Error('Failed to fetch leagues')
      }
      return await res.json()
    },
    initialData,
    staleTime,
  })
}

/**
 * リーグ詳細を取得
 * @param leagueId - リーグID
 */
export const useLeague = (leagueId: string) => {
  return useQuery({
    queryKey: ['leagues', leagueId],
    queryFn: async () => {
      const res = await apiClient.api.leagues[':id'].$get({
        param: { id: leagueId },
      })
      if (!res.ok) {
        throw new Error('Failed to fetch league')
      }
      return await res.json()
    },
    // リーグIDがない場合はクエリを無効化
    enabled: !!leagueId,
  })
}

// ------------------------
// Mutation Hooks (データ更新)
// ------------------------

/**
 * リーグを作成
 */
export const useCreateLeague = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateLeagueInput) => {
      const res = await apiClient.api.leagues.$post({
        json: data,
      })
      if (!res.ok) {
        throw new Error('Failed to create league')
      }
      return await res.json()
    },
    onSuccess: () => {
      // リーグ一覧のキャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

/**
 * リーグを更新
 */
export const useUpdateLeague = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ leagueId, data }: { leagueId: string; data: UpdateLeagueInput }) => {
      const res = await apiClient.api.leagues[':id'].$patch({
        param: { id: leagueId },
        json: data,
      })
      if (!res.ok) {
        throw new Error('Failed to update league')
      }
      return await res.json()
    },
    onSuccess: () => {
      // リーグ関連のクエリ（一覧・詳細）を一括無効化
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

/**
 * リーグを削除（論理削除）
 */
export const useDeleteLeague = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (leagueId: string) => {
      const res = await apiClient.api.leagues[':id'].$delete({
        param: { id: leagueId },
      })
      if (!res.ok) {
        throw new Error('Failed to delete league')
      }
    },
    onSuccess: () => {
      // リーグ一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

/**
 * リーグステータスを変更
 */
export const useUpdateLeagueStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      leagueId,
      status,
    }: {
      leagueId: string
      status: UpdateLeagueStatusInput['status']
    }) => {
      const res = await apiClient.api.leagues[':id'].status.$patch({
        param: { id: leagueId },
        json: { status },
      })
      if (!res.ok) {
        throw new Error('Failed to update league status')
      }
      return await res.json()
    },
    onSuccess: () => {
      // リーグ関連のクエリ（一覧・詳細）を一括無効化
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

// ------------------------
// Player Mutation Hooks
// ------------------------

/**
 * プレイヤー名を更新
 */
export const useUpdatePlayerName = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      leagueId,
      playerId,
      name,
    }: {
      leagueId: string
      playerId: string
      name: UpdatePlayerNameInput['name']
    }) => {
      const res = await apiClient.api.leagues[':leagueId'].players[':playerId'].$patch({
        param: { leagueId, playerId },
        json: { name },
      })
      if (!res.ok) {
        throw new Error('Failed to update player name')
      }
      return await res.json()
    },
    onSuccess: () => {
      // リーグ関連のクエリ（一覧・詳細）を一括無効化
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}

/**
 * プレイヤー権限を変更
 */
export const useUpdatePlayerRole = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      leagueId,
      playerId,
      role,
    }: {
      leagueId: string
      playerId: string
      role: UpdatePlayerRoleInput['role']
    }) => {
      const res = await apiClient.api.leagues[':leagueId'].players[':playerId'].role.$patch({
        param: { leagueId, playerId },
        json: { role },
      })
      if (!res.ok) {
        throw new Error('Failed to update player role')
      }
      return await res.json()
    },
    onSuccess: () => {
      // リーグ関連のクエリ（一覧・詳細）を一括無効化
      queryClient.invalidateQueries({ queryKey: ['leagues'] })
    },
  })
}
