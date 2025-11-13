import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

// エラーレスポンス型
export type ErrorResponse = {
  error: string
  message: string
  statusCode: number
}

// カスタムエラークラス
export class NotFoundError extends HTTPException {
  constructor(message = 'リソースが見つかりません') {
    super(404, { message })
  }
}

export class ForbiddenError extends HTTPException {
  constructor(message = '権限がありません') {
    super(403, { message })
  }
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
