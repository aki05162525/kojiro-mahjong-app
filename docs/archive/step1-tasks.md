# ステップ1: 基盤準備 - 実装タスク

Issue #06のステップ1を自分で実装するためのガイド

---

## タスク1: ディレクトリ構成作成

### 作成するディレクトリ

```bash
mkdir -p src/server/routes
mkdir -p src/server/services
mkdir -p src/server/repositories
mkdir -p src/server/middleware
mkdir -p src/server/validators
mkdir -p src/client/hooks
```

### ファイルを作成

以下のファイルを空で作成しておく（後のステップで実装）：

```bash
touch src/server/routes/index.ts
touch src/client/api.ts
```

### 確認方法

```bash
tree src/
```

期待される構造：
```
src/
├── server/
│   ├── routes/
│   │   └── index.ts
│   ├── services/
│   ├── repositories/
│   ├── middleware/
│   └── validators/
└── client/
    ├── api.ts
    └── hooks/
```

---

## タスク2: データベース接続設定

### 現状確認

`db/index.ts` はすでに実装済み：

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '.'

const client = postgres(process.env.DATABASE_URL!, { prepare: false })
export const db = drizzle({ client, schema })
```

### やるべきこと

**✅ このタスクは完了済み** - 既存の実装を確認するだけでOK

### 確認方法

1. `.env` ファイルに `DATABASE_URL` が設定されているか確認
2. Drizzle Studioで接続テスト：
   ```bash
   bun run db:studio
   ```

### 📚 公式ドキュメント

- [Drizzle ORM: PostgreSQL Driver (postgres.js)](https://orm.drizzle.team/docs/get-started-postgresql#postgresjs)
- [Drizzle Kit: Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview)

---

## タスク3: 認証ミドルウェア作成

### ファイル: `src/server/middleware/auth.ts`

### 実装内容

Supabase AuthのJWTトークンを検証し、ユーザー情報を取得するミドルウェアを作成

### 必要なパッケージ

```bash
bun add @supabase/supabase-js
```

### 実装例

```typescript
import { createMiddleware } from 'hono/factory'
import { createClient } from '@supabase/supabase-js'

// Supabaseクライアント初期化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Context型定義（認証後のユーザー情報を保持）
export type AuthContext = {
  Variables: {
    userId: string
  }
}

// 認証ミドルウェア
export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  // Authorizationヘッダーからトークン取得
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: '認証が必要です' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')

  // トークン検証
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return c.json({ error: 'Unauthorized', message: '無効なトークンです' }, 401)
  }

  // Context にユーザーIDを設定
  c.set('userId', data.user.id)

  await next()
})
```

### 実装のポイント

1. **環境変数の確認**
   - `.env` に以下が設定されているか確認：
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Context型定義**
   - `AuthContext` 型で `Variables.userId` を定義
   - これにより `c.get('userId')` が型安全になる

3. **エラーハンドリング**
   - トークンがない場合: `401 Unauthorized`
   - トークンが無効な場合: `401 Unauthorized`

### テスト方法

後のステップでルートに適用して、認証なしでアクセスすると401が返ることを確認

### 📚 公式ドキュメント

**Supabase Auth:**
- [Supabase: Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase: auth.getUser() API Reference](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Supabase: Advanced Server-Side Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Supabase: Auth in Edge Functions](https://supabase.com/docs/guides/functions/auth)

**Hono Middleware:**
- [Hono: createMiddleware (Factory)](https://hono.dev/docs/helpers/factory)
- [Hono: Context](https://hono.dev/docs/api/context)

**重要な注意点:**
- サーバーサイドでは常に `getUser()` を使用してトークン検証を行う
- `getSession()` はクライアントサイドでのみ使用し、サーバーサイドでは信頼しない（セッションCookieは偽装可能）
- `createMiddleware<AuthContext>` で型安全なミドルウェアを作成できる

---

## タスク4: エラーハンドラー作成

### ファイル: `src/server/middleware/error-handler.ts`

### 実装内容

統一されたエラーレスポンス形式を提供するミドルウェア

### 実装例

```typescript
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
      err.status
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
      400
    )
  }

  // その他の予期しないエラー
  return c.json<ErrorResponse>(
    {
      error: 'InternalServerError',
      message: 'サーバーエラーが発生しました',
      statusCode: 500,
    },
    500
  )
}
```

### カスタムエラークラスの作成（オプション）

特定のエラーを投げやすくするためのヘルパー：

```typescript
// src/server/middleware/error-handler.ts に追加

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

export class BadRequestError extends HTTPException {
  constructor(message: string) {
    super(400, { message })
  }
}
```

### 使い方（Honoアプリに適用）

`app/api/[...route]/route.ts` で使用例：

```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { errorHandler } from '@/src/server/middleware/error-handler'

const app = new Hono().basePath('/api')

// エラーハンドラーを設定
app.onError(errorHandler)

// ルート定義
app.get('/hello', (c) => {
  return c.json({ message: 'Hello from Hono!' })
})

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

### 実装のポイント

1. **統一されたエラー形式**
   ```typescript
   {
     error: string,      // エラータイプ
     message: string,    // ユーザー向けメッセージ
     statusCode: number  // HTTPステータスコード
   }
   ```

2. **エラーのログ出力**
   - `console.error()` で必ずログを出力
   - 本番環境では適切なロギングサービスに変更可能

3. **Zodエラーの処理**
   - `@hono/zod-validator` を使う場合、バリデーションエラーをキャッチ

### テスト方法

1. わざとエラーを投げるエンドポイントを作成
2. レスポンスが期待通りの形式か確認

```typescript
app.get('/test-error', (c) => {
  throw new Error('Test error')
})
```

### 📚 公式ドキュメント

- [Hono: App API (onError)](https://hono.dev/docs/api/hono)
- [Hono: HTTPException](https://hono.dev/docs/api/exception)
- [Hono: Middleware Guide](https://hono.dev/docs/guides/middleware)

**公式ドキュメントからのポイント:**
- `app.onError()` で未キャッチのエラーをハンドリング可能
- `HTTPException` を使うことで適切なステータスコードとメッセージを設定できる
- 親アプリとルートの両方に onError がある場合、ルートレベルが優先される

---

## ステップ1完了チェックリスト

- [ ] `src/server/` と `src/client/` のディレクトリ構成が作成された
- [ ] `db/index.ts` の接続設定を確認し、Drizzle Studioで接続できた
- [ ] `src/server/middleware/auth.ts` が実装された
- [ ] `src/server/middleware/error-handler.ts` が実装された
- [ ] `app/api/[...route]/route.ts` にエラーハンドラーを適用した
- [ ] 型エラーがなく、`bun run lint` が通る

---

## 次のステップへ

ステップ1が完了したら、ステップ2に進みます：

**ステップ2: リーグ作成API（最重要）**
1. バリデータ作成（`src/server/validators/leagues.validator.ts`）
2. リポジトリ作成（`src/server/repositories/leagues.repository.ts`）
3. サービス作成（`src/server/services/leagues.service.ts`）
4. ルート作成（`src/server/routes/leagues.ts`）
5. AppTypeエクスポート（`src/server/routes/index.ts`）

---

**作成日:** 2025-11-09
