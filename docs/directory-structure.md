# ディレクトリ構成ガイド

麻雀リーグ管理アプリのディレクトリ構成とアーキテクチャ設計

---

## 📁 推奨ディレクトリ構成

```
/
├── app/                              # Next.js App Router
│   ├── api/
│   │   └── [[...route]]/
│   │       └── route.ts              # Honoエントリーポイント（HTTPハンドラーのみ）
│   ├── layout.tsx
│   └── page.tsx
│
├── src/                              # APIビジネスロジック層
│   ├── routes/                       # Honoルート定義
│   │   ├── index.ts                  # 全ルートを統合
│   │   ├── leagues.ts                # リーグ管理エンドポイント
│   │   ├── players.ts                # プレイヤー管理エンドポイント
│   │   ├── sessions.ts               # 節管理エンドポイント
│   │   ├── scores.ts                 # 点数管理エンドポイント
│   │   └── rankings.ts               # ランキングエンドポイント
│   │
│   ├── services/                     # ビジネスロジック層
│   │   ├── leagues.service.ts
│   │   ├── players.service.ts
│   │   ├── sessions.service.ts       # 節生成ロジック
│   │   ├── scores.service.ts
│   │   └── rankings.service.ts       # ランキング計算ロジック
│   │
│   ├── repositories/                 # データアクセス層
│   │   ├── leagues.repository.ts
│   │   ├── players.repository.ts
│   │   ├── sessions.repository.ts
│   │   ├── scores.repository.ts
│   │   └── base.repository.ts        # 共通リポジトリ基底クラス（任意）
│   │
│   ├── middleware/                   # Hono用ミドルウェア
│   │   ├── auth.ts                   # Supabase認証チェック
│   │   └── error-handler.ts          # エラーハンドリング
│   │
│   ├── validators/                   # Zodバリデータ
│   │   ├── leagues.validator.ts
│   │   ├── players.validator.ts
│   │   └── common.validator.ts
│   │
│   ├── types/                        # 型定義
│   │   ├── api.ts                    # APIレスポンス型
│   │   ├── errors.ts                 # エラー型
│   │   └── index.ts
│   │
│   └── lib/                          # ユーティリティ
│       ├── supabase.ts               # Supabase Client
│       └── utils.ts
│
├── db/                               # データベース層（既存）
│   ├── index.ts                      # Drizzleクライアント初期化
│   └── schema/
│       ├── index.ts
│       ├── leagues.ts
│       ├── players.ts
│       ├── sessions.ts
│       ├── tables.ts
│       ├── scores.ts
│       ├── users.ts
│       └── link-requests.ts
│
├── drizzle/                          # マイグレーションファイル
├── docs/                             # ドキュメント
└── public/                           # 静的ファイル
```

---

## 🏗️ アーキテクチャパターン：3層アーキテクチャ

### レイヤー構成

```
Client Request
      ↓
[ Route Layer ]           ← ルーティング、バリデーション
      ↓
[ Service Layer ]         ← ビジネスロジック、トランザクション
      ↓
[ Repository Layer ]      ← データアクセス、Drizzle ORM
      ↓
   Database
```

### 各層の責務

#### 1. Route Layer（`src/routes/`）
**責務:**
- HTTPルーティング定義
- リクエストバリデーション（Zod）
- 認証ミドルウェア適用
- レスポンス整形

**ルール:**
- ビジネスロジックは書かない
- サービス層に処理を委譲
- 薄いレイヤーを保つ

#### 2. Service Layer（`src/services/`）
**責務:**
- ビジネスロジックの実装
- 複数リポジトリの調整
- トランザクション管理
- 権限チェック
- エラーハンドリング

**ルール:**
- HTTP詳細（Request/Response）を知らない
- リポジトリを通してのみDBアクセス
- ドメインロジックを集約

#### 3. Repository Layer（`src/repositories/`）
**責務:**
- データアクセスのみ
- Drizzle ORMクエリ実装
- CRUD操作

**ルール:**
- ビジネスロジックは書かない
- 再利用可能なクエリメソッド
- 型安全なデータ操作

---

## 📝 実装例

### 1. Honoエントリーポイント

**app/api/[[...route]]/route.ts**
```typescript
import { handle } from 'hono/vercel'
import { app } from '@/src/routes'

// HonoアプリをNext.js App Routerに統合
export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

**ポイント:**
- HTTPハンドラーのみを記述
- ルーティングロジックは`src/routes`に分離

---

### 2. ルート統合

**src/routes/index.ts**
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { errorHandler } from '@/src/middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

const app = new Hono().basePath('/api')

// グローバルミドルウェア
app.use('*', logger())
app.use('*', cors())
app.onError(errorHandler)

// ルートマウント
app.route('/leagues', leaguesRoutes)
app.route('/players', playersRoutes)

// ヘルスチェック
app.get('/health', (c) => c.json({ status: 'ok' }))

export { app }
```

**ポイント:**
- `app.route()`でドメインごとにルートを分離
- グローバルミドルウェアを一箇所で管理

---

### 3. ルート定義

**src/routes/leagues.ts**
```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as leaguesController from '@/src/controllers/leagues.controller'
import { authMiddleware } from '@/src/middleware/auth'
import { createLeagueSchema } from '@/src/validators/leagues.validator'

const app = new Hono()

// すべてのルートに認証を適用
app.use('*', authMiddleware)

// POST /api/leagues
app.post('/', zValidator('json', createLeagueSchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const league = await leaguesService.createLeague(userId, body)
  return c.json(league, 201)
})

// GET /api/leagues
app.get('/', async (c) => {
  const userId = c.get('userId')
  const leagues = await leaguesService.getLeaguesByUser(userId)
  return c.json({ leagues })
})

export default app
```

**ポイント:**
- ルーティングとバリデーションのみ
- サービス層に処理を委譲

---

### 4. サービス層

**src/services/leagues.service.ts**
```typescript
import { LeaguesRepository } from '@/src/repositories/leagues.repository'
import { PlayersRepository } from '@/src/repositories/players.repository'
import { HTTPException } from 'hono/http-exception'

export class LeaguesService {
  private leaguesRepo = new LeaguesRepository()
  private playersRepo = new PlayersRepository()

  async createLeague(userId: string, input: CreateLeagueInput) {
    // ビジネスロジック：プレイヤー数チェック
    if (input.players.length !== 8 && input.players.length !== 16) {
      throw new HTTPException(400, {
        message: 'プレイヤーは8人または16人である必要があります'
      })
    }

    // リーグ作成
    const league = await this.leaguesRepo.create({
      name: input.name,
      description: input.description,
      created_by: userId,
      status: 'active',
    })

    // プレイヤー作成（最初のプレイヤーにadmin権限）
    const players = await Promise.all(
      input.players.map((player, index) =>
        this.playersRepo.create({
          league_id: league.id,
          name: player.name,
          user_id: index === 0 ? userId : null,
          role: index === 0 ? 'admin' : null,
        })
      )
    )

    return { ...league, players }
  }

  async getLeaguesByUser(userId: string) {
    return this.leaguesRepo.findByUserId(userId)
  }

  private async checkAdminPermission(leagueId: string, userId: string) {
    const hasPermission = await this.playersRepo.hasAdminRole(leagueId, userId)
    if (!hasPermission) {
      throw new HTTPException(403, { message: '管理者権限が必要です' })
    }
  }
}
```

**ポイント:**
- ビジネスロジックとドメインルールを集約
- 複数リポジトリの組み合わせ
- トランザクション処理の調整

---

### 5. リポジトリ層

**src/repositories/leagues.repository.ts**
```typescript
import { db } from '@/db'
import { leagues, players } from '@/db/schema'
import { eq } from 'drizzle-orm'

export class LeaguesRepository {
  async create(data: typeof leagues.$inferInsert) {
    const [league] = await db.insert(leagues).values(data).returning()
    return league
  }

  async findById(id: string) {
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, id))
    return league
  }

  async findByUserId(userId: string) {
    return db
      .select({
        id: leagues.id,
        name: leagues.name,
        description: leagues.description,
        status: leagues.status,
        created_by: leagues.created_by,
        created_at: leagues.created_at,
        updated_at: leagues.updated_at,
      })
      .from(leagues)
      .innerJoin(players, eq(players.league_id, leagues.id))
      .where(eq(players.user_id, userId))
      .groupBy(leagues.id)
  }

  async update(id: string, data: Partial<typeof leagues.$inferInsert>) {
    const [league] = await db
      .update(leagues)
      .set({ ...data, updated_at: new Date() })
      .where(eq(leagues.id, id))
      .returning()
    return league
  }
}
```

**ポイント:**
- データアクセスのみに専念
- Drizzle ORMを活用
- 再利用可能なクエリメソッド

---

### 6. バリデータ

**src/validators/leagues.validator.ts**
```typescript
import { z } from 'zod'

export const createLeagueSchema = z.object({
  name: z.string().min(1).max(20),
  description: z.string().optional(),
  players: z.array(
    z.object({
      name: z.string().min(1).max(20)
    })
  ).refine(
    (arr) => arr.length === 8 || arr.length === 16,
    { message: 'プレイヤーは8人または16人である必要があります' }
  )
})

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>
```

---

### 7. 認証ミドルウェア

**src/middleware/auth.ts**
```typescript
import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: '認証が必要です' })
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new HTTPException(401, { message: '無効な認証トークンです' })
  }

  c.set('userId', user.id)
  c.set('user', user)

  await next()
}
```

---

### 8. エラーハンドラー

**src/middleware/error-handler.ts**
```typescript
import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('Error:', err)

  if (err instanceof HTTPException) {
    return c.json({
      error: err.name,
      message: err.message,
      statusCode: err.status,
    }, err.status)
  }

  if (err.name === 'ZodError') {
    return c.json({
      error: 'ValidationError',
      message: '入力データが不正です',
      statusCode: 400,
      details: err.errors,
    }, 400)
  }

  return c.json({
    error: 'InternalServerError',
    message: 'サーバーエラーが発生しました',
    statusCode: 500,
  }, 500)
}
```

---

### 9. データベースクライアント

**db/index.ts**
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

export const client = postgres(connectionString)
export const db = drizzle(client, { schema })
```

---

## ✅ この構成の利点

### 1. **明確な責務分離**
- Routes: ルーティングとバリデーション
- Services: ビジネスロジック
- Repositories: データアクセス

### 2. **テスタビリティ**
- 各層が独立しているため、ユニットテストが容易
- モックやスタブの注入が簡単

### 3. **スケーラビリティ**
- ドメインごとにファイルを分割
- 新しい機能追加が容易
- チーム開発でのコンフリクト回避

### 4. **型安全性**
- TypeScript + Zod
- Drizzle ORMによる型推論
- エンドツーエンドの型安全性

### 5. **保守性**
- 関心の分離により、変更の影響範囲が明確
- ビジネスロジックの再利用が容易
- コードの可読性向上

---

## 📚 ベストプラクティス

### 1. **app.route()でモジュール化**
ドメインごとにルートファイルを分割し、大規模アプリでも整理された状態を保つ

### 2. **srcディレクトリにAPI層を配置**
app/apiはHTTPハンドラーのみ、ビジネスロジックはsrc配下に集約

### 3. **3層アーキテクチャを採用**
Controller → Service → Repository の各層の責務を明確に分離

### 4. **Honoの機能を最大活用**
- zValidator: Zodによるバリデーション
- ミドルウェア: 認証、エラーハンドリング
- HTTPException: 統一されたエラーレスポンス

### 5. **Drizzle ORMとの統合**
リポジトリ層でDrizzleを使用し、型安全なデータアクセスを実現

---

## 🔗 参考リソース

- [Hono公式ドキュメント](https://hono.dev/)
- [Drizzle ORM公式ドキュメント](https://orm.drizzle.team/)
- [Zod公式ドキュメント](https://zod.dev/)
- [API設計書](./api-design.md)

---

**作成日:** 2025-11-09
**最終更新:** 2025-11-09
