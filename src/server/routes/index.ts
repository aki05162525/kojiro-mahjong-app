import { Hono } from 'hono'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

const app = new Hono().basePath('/api')

// ★すべてのルートを1つの式でチェーン（型推論に必須）
const routes = app.route('/leagues', leaguesRoutes).route('/leagues', playersRoutes)

// ★AppTypeをエクスポート（Hono RPCで使用）
export type AppType = typeof routes

export default routes
