import { z } from '@hono/zod-openapi'

/**
 * League status enum
 */
export const LeagueStatusSchema = z.enum(['active', 'completed', 'deleted']).openapi({
  description: 'League status',
  example: 'active',
})

/**
 * League object schema
 */
export const LeagueSchema = z
  .object({
    id: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174000',
      description: 'League ID',
    }),
    name: z.string().min(1).max(20).openapi({
      example: '2025 Spring League',
      description: 'League name (1-20 characters)',
    }),
    description: z.string().nullable().openapi({
      example: 'Every Friday evening',
      description: 'League description (optional)',
    }),
    status: LeagueStatusSchema,
    createdBy: z.string().uuid().openapi({
      description: 'Creator user ID',
    }),
    createdAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: 'Created at timestamp',
    }),
    updatedAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: 'Updated at timestamp',
    }),
  })
  .openapi('League')

/**
 * Leagues list response
 */
export const LeaguesResponseSchema = z
  .object({
    leagues: z.array(LeagueSchema).openapi({
      description: 'List of leagues the user participates in',
    }),
  })
  .openapi('LeaguesResponse')

/**
 * Create league request
 */
export const CreateLeagueRequestSchema = z
  .object({
    name: z.string().min(1).max(20).openapi({
      example: '2025 Spring League',
      description: 'League name (1-20 characters)',
    }),
    description: z.string().optional().openapi({
      example: 'Every Friday evening',
      description: 'League description (optional)',
    }),
    playerCount: z.enum(['8', '16']).openapi({
      example: '8',
      description: 'Number of players (8 or 16)',
    }),
    playerNames: z.array(z.string().min(1).max(20)).openapi({
      example: ['Player 1', 'Player 2', 'Player 3'],
      description: 'List of player names',
    }),
  })
  .refine((data) => data.playerNames.length === Number.parseInt(data.playerCount, 10), {
    message: 'playerNames length must match playerCount (8 or 16)',
    path: ['playerNames'],
  })
  .openapi('CreateLeagueRequest')

/**
 * Update league request
 */
export const UpdateLeagueRequestSchema = z
  .object({
    name: z.string().min(1).max(20).optional().openapi({
      example: '2025 Spring League (Updated)',
      description: 'League name (1-20 characters)',
    }),
    description: z.string().optional().openapi({
      example: 'Every Friday evening (Updated)',
      description: 'League description (optional)',
    }),
  })
  .openapi('UpdateLeagueRequest')

/**
 * Update league status request
 */
export const UpdateLeagueStatusRequestSchema = z
  .object({
    status: LeagueStatusSchema,
  })
  .openapi('UpdateLeagueStatusRequest')
