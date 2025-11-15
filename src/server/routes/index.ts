import { OpenAPIHono } from '@hono/zod-openapi'
import { errorHandler } from '../middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

const app = new OpenAPIHono().basePath('/api')

// エラーハンドラーを登録
app.onError(errorHandler)

// ★すべてのルートを1つの式でチェーン（型推論に必須）
const routes = app.route('/leagues', leaguesRoutes).route('/leagues', playersRoutes)

// ★AppTypeをエクスポート（Hono RPCで使用）
export type AppType = typeof routes

export default routes
