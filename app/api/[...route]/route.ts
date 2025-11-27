import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import app from '@/src/server/routes'

// RPC と OpenAPI が統合されたアプリをマウント
const mainApp = new Hono().route('/', app)

export const GET = handle(mainApp)
export const POST = handle(mainApp)
export const PATCH = handle(mainApp)
export const DELETE = handle(mainApp)
