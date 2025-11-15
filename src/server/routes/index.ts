import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

const app = new OpenAPIHono().basePath('/api')

// エラーハンドラーを登録
app.onError(errorHandler)

// セキュリティスキームを登録
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Supabase AuthのJWTトークンを使用',
})

//  RPC用のルートを定義
const rpcRoutes = new Hono().route('/leagues', leaguesRoutes).route('/leagues', playersRoutes)

// ★AppTypeをエクスポート（Hono RPCで使用）
export type AppType = typeof rpcRoutes

// メインアプリにRPCルートを登録
app.route('/', rpcRoutes)

// OpenAPI仕様書エンドポイント
app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Kojiro Mahjong API',
    description: '麻雀リーグ管理アプリケーションのAPI',
  },
})

// Swagger UIエンドポイント
app.get('/ui', swaggerUI({ url: '/api/doc' }))

export default app
