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
 * Player schema for league creation
 */
const PlayerNameSchema = z
  .object({
    name: z.string().min(1).max(20).openapi({
      example: 'Player 1',
      description: 'Player name (1-20 characters)',
    }),
  })
  .openapi('PlayerName')

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
    players: z
      .array(PlayerNameSchema)
      .openapi({
        example: [{ name: 'Player 1' }, { name: 'Player 2' }],
        description: 'List of players (must be exactly 8 or 16)',
      })
      .refine((players) => players.length === 8 || players.length === 16, {
        message: 'Players array must contain exactly 8 or 16 players',
      }),
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
