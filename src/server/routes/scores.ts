import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import {
  BadRequestResponse,
  ForbiddenResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from '../schemas/common'
import { UpdateTableScoresRequestSchema } from '../schemas/scores'
import * as scoresService from '../services/scores'

const app = new OpenAPIHono<AuthContext>()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

/**
 * PUT /api/tables/:tableId/scores - Update table scores
 */
const updateScoresRoute = createRoute({
  method: 'put',
  path: '/{tableId}/scores',
  tags: ['scores'],
  summary: 'Update table scores',
  description:
    'Update all scores for a table and calculate points automatically. Requires exactly 4 unique scores with a total of 100,000 points. Calculates scorePt, rank (with wind-based tiebreaking), rankPt, and totalPt.',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      tableId: z
        .string()
        .uuid()
        .openapi({
          param: {
            name: 'tableId',
            in: 'path',
          },
          example: '123e4567-e89b-12d3-a456-426614174000',
          description: 'Table ID',
        }),
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateTableScoresRequestSchema,
        },
      },
      description: 'Score update request (4 players, total must be 100,000)',
    },
  },
  responses: {
    204: {
      description: 'Successfully updated scores',
    },
    400: BadRequestResponse,
    401: UnauthorizedResponse,
    403: ForbiddenResponse,
    404: NotFoundResponse,
  },
})

app.openapi(updateScoresRoute, async (c) => {
  const { tableId } = c.req.valid('param')
  const data = c.req.valid('json')

  await scoresService.updateTableScores(tableId, data)
  return c.body(null, 204)
})

export default app
