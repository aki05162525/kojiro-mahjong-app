import { z } from '@hono/zod-openapi'
import { createSessionSchema, tableTypeSchema, windSchema } from '@/src/schemas/sessions'

/**
 * Table type enum (OpenAPI decorated)
 */
export const TableTypeSchema = tableTypeSchema.openapi({
  description: 'Table type',
  example: 'upper',
})

/**
 * Wind enum (OpenAPI decorated)
 */
export const WindSchema = windSchema.openapi({
  description: 'Player wind position',
  example: 'east',
})

/**
 * Player schema (embedded in session score)
 */
export const SessionPlayerSchema = z
  .object({
    id: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174001',
      description: 'Player ID',
    }),
    name: z.string().min(1).max(20).openapi({
      example: 'Player 1',
      description: 'Player name',
    }),
  })
  .openapi('SessionPlayer')

/**
 * Session score schema
 */
export const SessionScoreSchema = z
  .object({
    id: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174003',
      description: 'Score ID',
    }),
    playerId: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174001',
      description: 'Player ID',
    }),
    wind: WindSchema,
    finalScore: z.number().int().nullable().openapi({
      example: 25000,
      description: 'Final score (null if not entered yet)',
    }),
    scorePt: z.string().nullable().openapi({
      example: '+10.0',
      description: 'Score points (null if not calculated yet)',
    }),
    rank: z.number().int().min(1).max(4).nullable().openapi({
      example: 1,
      description: 'Rank in table (1-4, null if not entered yet)',
    }),
    rankPt: z.number().nullable().openapi({
      example: 30.0,
      description: 'Rank points (null if not calculated yet)',
    }),
    totalPt: z.string().nullable().openapi({
      example: '+40.0',
      description: 'Total points (null if not calculated yet)',
    }),
    player: SessionPlayerSchema,
  })
  .openapi('SessionScore')

/**
 * Session table schema
 */
export const SessionTableSchema = z
  .object({
    id: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174002',
      description: 'Table ID',
    }),
    sessionId: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Session ID',
    }),
    tableNumber: z.number().int().min(1).openapi({
      example: 1,
      description: 'Table number',
    }),
    tableType: TableTypeSchema,
    createdAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: 'Created at timestamp',
    }),
    updatedAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: 'Updated at timestamp',
    }),
    scores: z.array(SessionScoreSchema).openapi({
      description: 'Scores for this table',
    }),
  })
  .openapi('SessionTable')

/**
 * Session schema
 */
export const SessionSchema = z
  .object({
    id: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Session ID',
    }),
    leagueId: z.string().uuid().openapi({
      example: '123e4567-e89b-12d3-a456-426614174000',
      description: 'League ID',
    }),
    sessionNumber: z.number().int().min(1).openapi({
      example: 1,
      description: 'Session number',
    }),
    createdAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: 'Created at timestamp',
    }),
    updatedAt: z.string().datetime().openapi({
      example: '2025-01-15T10:00:00Z',
      description: 'Updated at timestamp',
    }),
    tables: z.array(SessionTableSchema).openapi({
      description: 'Tables in this session',
    }),
  })
  .openapi('Session')

/**
 * Sessions list response
 */
export const SessionsResponseSchema = z
  .object({
    sessions: z.array(SessionSchema).openapi({
      description: 'List of sessions in the league',
    }),
  })
  .openapi('SessionsResponse')

/**
 * Create session request (OpenAPI decorated)
 */
export const CreateSessionRequestSchema = createSessionSchema.openapi('CreateSessionRequest')
