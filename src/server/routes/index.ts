import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { errorHandler } from '../middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'
import sessionsRoutes from './sessions'

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
// ★ playersRoutes と sessionsRoutes は /leagues/:leagueId/* のパスを持つため、/leagues でマウント
const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/leagues', playersRoutes)
  .route('/leagues', sessionsRoutes)

// ★ RPC用の型をエクスポート（フロントエンドで使用）
// 注意: ドキュメントルート(/doc, /ui)を追加する前にエクスポートし、純粋なAPIエンドポイントの型のみを提供
export type AppType = typeof routes

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

export default routes
