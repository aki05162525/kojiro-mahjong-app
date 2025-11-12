import { type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

// エラーレスポンス型
export type ErrorResponse = {
  error: string
  message: string
  statusCode: number
}

// グローバルエラーハンドラー
export const errorHandler = (err: Error, c: Context) => {
  console.error('Error occurred:', err)

  // HTTPExceptionの場合
  if (err instanceof HTTPException) {
    return c.json<ErrorResponse>(
      {
        error: err.name,
        message: err.message,
        statusCode: err.status,
      },
      err.status,
    )
  }

  // Zodバリデーションエラーの場合
  // (@hono/zod-validatorが投げるエラー)
  if (err.name === 'ValidationError') {
    return c.json<ErrorResponse>(
      {
        error: 'ValidationError',
        message: err.message,
        statusCode: 400,
      },
      400,
    )
  }

  // その他の予期しないエラー
  return c.json<ErrorResponse>(
    {
      error: 'InternalServerError',
      message: 'サーバーエラーが発生しました',
      statusCode: 500,
    },
    500,
  )
}
