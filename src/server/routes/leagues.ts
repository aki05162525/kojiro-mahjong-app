import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as leaguesService from '../services/leagues'
import { createLeagueSchema } from '../validators/leagues'

const app = new Hono<AuthContext>()

// すべてのルートに認証ミドルウェアを適用
app.use('*', authMiddleware)

// POST /api/leagues - リーグ作成
app.post('/', zValidator('json', createLeagueSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  const league = await leaguesService.createLeague(userId, data)

  return c.json(league, 201)
})

// GET /api/leagues - リーグ一覧
app.get('/', async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})

// GET /api/leagues/:id - リーグ詳細
app.get('/:id', async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')

  const league = await leaguesService.getLeagueById(leagueId, userId)

  return c.json(league, 200)
})

export default app
