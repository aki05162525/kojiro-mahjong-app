import { z } from '@hono/zod-openapi'

/**
 * Update player name request
 */
export const UpdatePlayerNameRequestSchema = z
  .object({
    name: z.string().min(1).max(20).openapi({
      example: 'Player 1 (Updated)',
      description: 'Player name (1-20 characters)',
    }),
  })
  .openapi('UpdatePlayerNameRequest')

/**
 * Update player role request
 */
export const UpdatePlayerRoleRequestSchema = z
  .object({
    role: z.enum(['admin', 'scorer', 'viewer']).nullable().openapi({
      example: 'scorer',
      description: 'Player role (null if no role assigned)',
    }),
  })
  .openapi('UpdatePlayerRoleRequest')

/**
 * Player response (simplified version without league data)
 */
export const PlayerResponseSchema = z
  .object({
    id: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174001',
      description: 'Player ID',
    }),
    name: z.string().min(1).max(20).openapi({
      example: 'Player 1',
      description: 'Player name (1-20 characters)',
    }),
    userId: z.string().uuid().nullable().openapi({
      example: '123e4567-e89b-12d3-a456-426614174002',
      description: 'Linked user ID (null if not linked)',
    }),
    role: z.enum(['admin', 'scorer', 'viewer']).nullable().openapi({
      example: 'admin',
      description: 'Player role (null if no role assigned)',
    }),
    updatedAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: 'Updated at timestamp',
    }),
  })
  .openapi('PlayerResponse')
