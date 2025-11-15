import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { errorHandler } from '../middleware/error-handler'
import leaguesOpenAPIRoutes from './routes/leagues'

const app = new OpenAPIHono().basePath('/api')

// Register error handler
app.onError(errorHandler)

// Register security scheme
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Supabase Auth JWT token',
})

// Register OpenAPI routes
app.route('/leagues', leaguesOpenAPIRoutes)

// OpenAPI specification endpoint
app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Kojiro Mahjong API',
    description: 'Mahjong league management application API',
  },
})

// Swagger UI endpoint
app.get('/ui', swaggerUI({ url: '/api/doc' }))

export default app
