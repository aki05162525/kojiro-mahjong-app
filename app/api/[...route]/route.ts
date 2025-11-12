import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { errorHandler } from '@/src/server/middleware/error-handler'

const app = new Hono().basePath('/api')

app.onError(errorHandler)

app.get('/hello', (c) => {
  return c.json({
    message: 'Hello from Hono!',
  })
})

export const GET = handle(app)
