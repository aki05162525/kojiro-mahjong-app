import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import { ForbiddenResponse, NotFoundResponse, UnauthorizedResponse } from '../schemas/common'
import {
  PlayerResponseSchema,
  UpdatePlayerNameRequestSchema,
  UpdatePlayerRoleRequestSchema,
} from '../schemas/players'
import * as playersService from '../services/players'

const app = new OpenAPIHono<AuthContext>()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

/**
 * PATCH /api/leagues/:leagueId/players/:playerId - Update player name
 */
const updatePlayerNameRoute = createRoute({
  method: 'patch',
  path: '/{leagueId}/players/{playerId}',
  tags: ['players'],
  summary: 'Update player name',
  description: 'Update player name (for fixing typos)',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      leagueId: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'leagueId',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'League ID',
        }),
      playerId: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'playerId',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174001',
          description: 'Player ID',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdatePlayerNameRequestSchema,
        },
      },
      description: 'Player name update request',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PlayerResponseSchema,
        },
      },
      description: 'Successfully updated player name',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(updatePlayerNameRoute, async (c) => {
  const userId = c.get('userId')
  const { leagueId, playerId } = c.req.valid('param')
  const { name } = c.req.valid('json')

  const player = await playersService.updatePlayerName(leagueId, playerId, userId, name)

  return c.json(player, 200)
})

/**
 * PATCH /api/leagues/:leagueId/players/:playerId/role - Update player role
 */
const updatePlayerRoleRoute = createRoute({
  method: 'patch',
  path: '/{leagueId}/players/{playerId}/role',
  tags: ['players'],
  summary: 'Update player role',
  description: 'Update player role (admin permission required)',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      leagueId: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'leagueId',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'League ID',
        }),
      playerId: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'playerId',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174001',
          description: 'Player ID',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdatePlayerRoleRequestSchema,
        },
      },
      description: 'Player role update request',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: PlayerResponseSchema,
        },
      },
      description: 'Successfully updated player role',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(updatePlayerRoleRoute, async (c) => {
  const userId = c.get('userId')
  const { leagueId, playerId } = c.req.valid('param')
  const { role } = c.req.valid('json')

  const player = await playersService.updatePlayerRole(leagueId, playerId, userId, role)

  return c.json(player, 200)
})

export default app
