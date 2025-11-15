import { z } from '@hono/zod-openapi'

/**
 * Common error response schema
 */
export const ErrorSchema = z
  .object({
    error: z.string().openapi({
      example: 'UnauthorizedError',
      description: 'エラーの種類',
    }),
    message: z.string().openapi({
      example: '認証が必要です',
      description: 'エラーメッセージ',
    }),
    statusCode: z.number().openapi({
      example: 401,
      description: 'HTTPステータスコード',
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
  description: '認証エラー',
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
  description: '禁止 - 権限がありません',
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
  description: 'リソースが見つかりません',
}
