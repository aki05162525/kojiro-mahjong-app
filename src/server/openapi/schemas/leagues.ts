import { z } from '@hono/zod-openapi'

/**
 * Player role enum
 */
export const PlayerRoleSchema = z.enum(['admin', 'scorer', 'viewer']).nullable().openapi({
  description: 'Player role (null if no role assigned)',
  example: 'admin',
})

/**
 * Player schema (embedded in league responses)
 */
export const PlayerSchema = z
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
    role: PlayerRoleSchema,
    createdAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: 'Created at timestamp',
    }),
  })
  .openapi('Player')

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
    players: z.array(PlayerSchema).openapi({
      description: 'List of players in this league',
    }),
  })
  .openapi('League')

/**
 * League summary schema (for list endpoints, without players)
 */
export const LeagueSummarySchema = z
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
  .openapi('LeagueSummary')

/**
 * Leagues list response
 */
export const LeaguesResponseSchema = z
  .object({
    leagues: z.array(LeagueSummarySchema).openapi({
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
      .union([z.array(PlayerNameSchema).length(8), z.array(PlayerNameSchema).length(16)])
      .openapi({
        example: [
          { name: 'Player 1' },
          { name: 'Player 2' },
          { name: 'Player 3' },
          { name: 'Player 4' },
          { name: 'Player 5' },
          { name: 'Player 6' },
          { name: 'Player 7' },
          { name: 'Player 8' },
        ],
        description: 'List of players (must be exactly 8 or 16)',
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
