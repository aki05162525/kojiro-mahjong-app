import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { zValidator } from '@hono/zod-validator'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as leaguesService from '../services/leagues'
import {
  createLeagueSchema,
  updateLeagueSchema,
  updateLeagueStatusSchema,
} from '../validators/leagues'

const app = new OpenAPIHono<AuthContext>()

// すべてのルートに認証ミドルウェアを適用
app.use('*', authMiddleware)

// 共通スキーマ定義
const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'UnauthorizedError' }),
    message: z.string().openapi({ example: '認証が必要です' }),
    statusCode: z.number().openapi({ example: 401 }),
  })
  .openapi('Error')

const LeagueSchema = z
  .object({
    id: z.string().uuid().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
    name: z.string().openapi({ example: '2025年春リーグ' }),
    description: z.string().nullable().openapi({ example: '毎週金曜日開催' }),
    status: z.enum(['active', 'completed', 'deleted']).openapi({ example: 'active' }),
    createdBy: z.string().uuid(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('League')

const LeaguesResponseSchema = z
  .object({
    leagues: z.array(LeagueSchema),
  })
  .openapi('LeaguesResponse')

// OpenAPI対応ルート定義
const getLeaguesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['leagues'],
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeaguesResponseSchema,
        },
      },
      description: 'ユーザーが参加しているリーグ一覧を取得',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorSchema,
        },
      },
      description: '認証エラー',
    },
  },
})

// ルート実装
app.openapi(getLeaguesRoute, async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})

// 既存のルートもそのまま維持（段階的移行のため）

// POST /api/leagues - リーグ作成
app.post('/', zValidator('json', createLeagueSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  const league = await leaguesService.createLeague(userId, data)

  return c.json(league, 201)
})

// GET /api/leagues/:id - リーグ詳細
app.get('/:id', async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')

  const league = await leaguesService.getLeagueById(leagueId, userId)

  return c.json(league, 200)
})

// PATCH /api/leagues/:id - リーグ更新
app.patch('/:id', zValidator('json', updateLeagueSchema), async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const data = c.req.valid('json')

  const league = await leaguesService.updateLeague(leagueId, userId, data)

  return c.json(league, 200)
})

// DELETE /api/leagues/:id - リーグ削除
app.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')

  await leaguesService.deleteLeague(leagueId, userId)

  return c.body(null, 204)
})

// PATCH /api/leagues/:id/status - ステータス変更
app.patch('/:id/status', zValidator('json', updateLeagueStatusSchema), async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  const { status } = c.req.valid('json')

  const league = await leaguesService.updateLeagueStatus(leagueId, userId, status)

  return c.json(league, 200)
})

export default app
