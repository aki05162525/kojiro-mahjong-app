import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createSessionSchema } from '@/src/schemas/sessions'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as sessionsService from '../services/sessions'

const app = new Hono<AuthContext>()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

/**
 * POST /api/leagues/:leagueId/sessions - Create session
 */
app.post(
  '/:leagueId/sessions',
  zValidator(
    'param',
    z.object({
      leagueId: z.string().uuid(),
    }),
  ),
  zValidator('json', createSessionSchema),
  async (c) => {
    const userId = c.get('userId')
    const { leagueId } = c.req.valid('param')

    try {
      const session = await sessionsService.createSession(leagueId, userId)
      return c.json(session, 201)
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400)
      }
      return c.json({ error: 'Failed to create session' }, 500)
    }
  },
)

/**
 * GET /api/leagues/:leagueId/sessions - Get sessions list
 */
app.get(
  '/:leagueId/sessions',
  zValidator(
    'param',
    z.object({
      leagueId: z.string().uuid(),
    }),
  ),
  async (c) => {
    const userId = c.get('userId')
    const { leagueId } = c.req.valid('param')

    try {
      const sessions = await sessionsService.getSessionsByLeagueId(leagueId, userId)
      return c.json({ sessions }, 200)
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400)
      }
      return c.json({ error: 'Failed to fetch sessions' }, 500)
    }
  },
)

export default app
