import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { errorHandler } from '../middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

const app = new OpenAPIHono().basePath('/api')

// エラーハンドラーを登録
app.onError(errorHandler)

// セキュリティスキーマを登録
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Supabase Auth JWT token',
})

// OpenAPIルートを定義
// ★ playersRoutes は /leagues/:leagueId/players/* のパスを持つため、/leagues でマウント
const routes = app.route('/leagues', leaguesRoutes).route('/leagues', playersRoutes)

// OpenAPI仕様エンドポイント
routes.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Kojiro Mahjong API',
    description: 'Mahjong league management application API',
  },
})

// Swagger UI エンドポイント
routes.get('/ui', swaggerUI({ url: '/api/doc' }))

// ★ RPC用の型をエクスポート（フロントエンドで使用）
export type AppType = typeof routes

export default routes
