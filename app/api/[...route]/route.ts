import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import openapiApp from '@/src/server/openapi'
import rpcApp from '@/src/server/routes'

// メインアプリを作成
const app = new Hono()

// RPC ルートをマウント（既存）
app.route('/', rpcApp)

// OpenAPI ルートをマウント（新規）
app.route('/', openapiApp)

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
