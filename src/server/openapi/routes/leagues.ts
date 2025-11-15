import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AuthContext } from '../../middleware/auth'
import { authMiddleware } from '../../middleware/auth'
import * as leaguesService from '../../services/leagues'
import { ForbiddenResponse, NotFoundResponse, UnauthorizedResponse } from '../schemas/common'
import {
  CreateLeagueRequestSchema,
  LeagueSchema,
  LeaguesResponseSchema,
  UpdateLeagueRequestSchema,
  UpdateLeagueStatusRequestSchema,
} from '../schemas/leagues'

const app = new OpenAPIHono<AuthContext>()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

/**
 * GET /api/leagues - Get leagues list
 */
const getLeaguesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['leagues'],
  summary: 'Get leagues list',
  description: 'Get list of leagues the user participates in',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeaguesResponseSchema,
        },
      },
      description: 'Successfully retrieved leagues list',
    },
    401: UnauthorizedResponse,
  },
})

app.openapi(getLeaguesRoute, async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})

/**
 * POST /api/leagues - Create league
 */
const createLeagueRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['leagues'],
  summary: 'Create league',
  description: 'Create a new league. Creator is automatically granted admin permissions.',
  security: [{ Bearer: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateLeagueRequestSchema,
        },
      },
      description: 'League creation request',
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: LeagueSchema,
        },
      },
      description: 'Successfully created league',
    },
    401: UnauthorizedResponse,
  },
})

app.openapi(createLeagueRoute, async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')
  const league = await leaguesService.createLeague(userId, data)
  return c.json(league, 201)
})

/**
 * GET /api/leagues/:id - Get league details
 */
const getLeagueRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['leagues'],
  summary: 'Get league details',
  description: 'Get details of a specific league by ID',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'id',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'League ID',
        }),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeagueSchema,
        },
      },
      description: 'Successfully retrieved league details',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(getLeagueRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const league = await leaguesService.getLeagueById(leagueId, userId)
  return c.json(league, 200)
})

/**
 * PATCH /api/leagues/:id - Update league
 */
const updateLeagueRoute = createRoute({
  method: 'patch',
  path: '/{id}',
  tags: ['leagues'],
  summary: 'Update league',
  description: 'Update league name or description (admin permission required)',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'id',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'League ID',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateLeagueRequestSchema,
        },
      },
      description: 'League update request',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeagueSchema,
        },
      },
      description: 'Successfully updated league',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(updateLeagueRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const data = c.req.valid('json')
  const league = await leaguesService.updateLeague(leagueId, userId, data)
  return c.json(league, 200)
})

/**
 * DELETE /api/leagues/:id - Delete league
 */
const deleteLeagueRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['leagues'],
  summary: 'Delete league',
  description: 'Soft delete a league (admin permission required)',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'id',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'League ID',
        }),
    }),
  },
  responses: {
    204: {
      description: 'Successfully deleted league',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(deleteLeagueRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  await leaguesService.deleteLeague(leagueId, userId)
  return c.body(null, 204)
})

/**
 * PATCH /api/leagues/:id/status - Update league status
 */
const updateLeagueStatusRoute = createRoute({
  method: 'patch',
  path: '/{id}/status',
  tags: ['leagues'],
  summary: 'Update league status',
  description: 'Update league status (admin permission required)',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'id',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'League ID',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateLeagueStatusRequestSchema,
        },
      },
      description: 'Status update request',
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeagueSchema,
        },
      },
      description: 'Successfully updated league status',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(updateLeagueStatusRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const { status } = c.req.valid('json')
  const league = await leaguesService.updateLeagueStatus(leagueId, userId, status)
  return c.json(league, 200)
})

export default app
