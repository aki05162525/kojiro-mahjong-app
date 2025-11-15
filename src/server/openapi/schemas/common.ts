import { z } from '@hono/zod-openapi'

/**
 * Common error response schema
 */
export const ErrorSchema = z
  .object({
    error: z.string().openapi({
      example: 'UnauthorizedError',
      description: 'Error type',
    }),
    message: z.string().openapi({
      example: 'Authentication required',
      description: 'Error message',
    }),
    statusCode: z.number().openapi({
      example: 401,
      description: 'HTTP status code',
    }),
  })
  .openapi('Error')

/**
 * Unauthorized error response (reusable)
 */
export const UnauthorizedResponse = {
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
  description: 'Authentication error',
}

/**
 * Forbidden error response (reusable)
 */
export const ForbiddenResponse = {
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
  description: 'Forbidden - insufficient permissions',
}

/**
 * Not found error response (reusable)
 */
export const NotFoundResponse = {
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
  description: 'Resource not found',
}
