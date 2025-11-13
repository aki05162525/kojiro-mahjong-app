import { Hono } from 'hono'
import leaguesRoutes from './leagues'

const app = new Hono().basePath('/api')

// ★すべてのルートを1つの式でチェーン（型推論に必須）
const routes = app.route('/leagues', leaguesRoutes)

// ★AppTypeをエクスポート（Hono RPCで使用）
export type AppType = typeof routes

export default app
