import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as playersService from '../services/players'
import {
  playerParamSchema,
  updatePlayerNameSchema,
  updatePlayerRoleSchema,
} from '../validators/leagues'

const app = new Hono<AuthContext>()

// すべてのルートに認証ミドルウェアを適用
app.use('*', authMiddleware)

// PATCH /api/leagues/:id/players/:playerId - プレイヤー名更新
app.patch(
  '/:id/players/:playerId',
  zValidator('param', playerParamSchema),
  zValidator('json', updatePlayerNameSchema),
  async (c) => {
    const userId = c.get('userId')
    const { id, playerId } = c.req.valid('param')
    const { name } = c.req.valid('json')

    const player = await playersService.updatePlayerName(id, playerId, userId, name)

    return c.json(player, 200)
  },
)

// PATCH /api/leagues/:id/players/:playerId/role - プレイヤー権限変更
app.patch(
  '/:id/players/:playerId/role',
  zValidator('param', playerParamSchema),
  zValidator('json', updatePlayerRoleSchema),
  async (c) => {
    const userId = c.get('userId')
    const { id, playerId } = c.req.valid('param')
    const { role } = c.req.valid('json')

    const player = await playersService.updatePlayerRole(id, playerId, userId, role)

    return c.json(player, 200)
  },
)

export default app
