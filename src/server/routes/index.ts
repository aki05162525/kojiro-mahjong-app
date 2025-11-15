import { Hono } from 'hono'
import { errorHandler } from '../middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

const app = new Hono().basePath('/api')

// エラーハンドラーを登録
app.onError(errorHandler)

// RPC用のルートを定義（basePath付き）
const routes = app.route('/leagues', leaguesRoutes).route('/leagues', playersRoutes)

// ★AppTypeをエクスポート（Hono RPCで使用、basePath含む）
export type AppType = typeof routes

export default app
