import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  BadRequestResponse,
  ForbiddenResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from '../schemas/common'
import {
  CreateSessionRequestSchema,
  SessionSchema,
  SessionsResponseSchema,
} from '../schemas/sessions'
import * as sessionsService from '../services/sessions'

const app = new OpenAPIHono<AuthContext>()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

/**
 * POST /api/leagues/:leagueId/sessions - Create session
 */
const createSessionRoute = createRoute({
  method: 'post',
  path: '/{leagueId}/sessions',
  tags: ['sessions'],
  summary: 'Create session',
  description:
    'Create a new session with automatic table assignment. For session 1, randomly assigns 16 players to 4 tables. For subsequent sessions, uses promotion/relegation based on previous results. Admin permission required.',
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
    }),
    body: {
      content: {
        'application/json': {
          schema: CreateSessionRequestSchema,
        },
      },
      description: 'Session creation request (empty body)',
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: SessionSchema,
        },
      },
      description: 'Successfully created session',
    },
    400: BadRequestResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(createSessionRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('leagueId')
  const session = await sessionsService.createSession(leagueId, userId)
  return c.json(session, 201)
})

/**
 * GET /api/leagues/:leagueId/sessions - Get sessions list
 */
const getSessionsRoute = createRoute({
  method: 'get',
  path: '/{leagueId}/sessions',
  tags: ['sessions'],
  summary: 'Get sessions list',
  description: 'Get list of all sessions in a league with table and score details',
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
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SessionsResponseSchema,
        },
      },
      description: 'Successfully retrieved sessions list',
    },
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(getSessionsRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('leagueId')
  const sessions = await sessionsService.getSessionsByLeagueId(leagueId, userId)
  return c.json({ sessions }, 200)
})

export default app
