# Hono Coding Guidelines

This document provides coding standards and best practices for Hono development in this project, based on lessons learned from implementation.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Import Rules](#import-rules)
4. [Routing Patterns](#routing-patterns)
5. [Validation](#validation)
6. [Type Safety](#type-safety)
7. [Error Handling](#error-handling)
8. [Common Mistakes](#common-mistakes)

---

## Architecture Overview

### Unified OpenAPI + RPC Pattern

This project uses **OpenAPIHono** as the single source of truth for both API documentation and type-safe frontend-backend communication.

| Feature | Technology | Purpose |
|---------|------------|---------|
| **Route Definition** | `OpenAPIHono` | All routes defined with OpenAPI metadata |
| **Type Safety** | Hono RPC (`AppType`) | Frontend gets full type inference from OpenAPI routes |
| **Documentation** | Swagger UI | Auto-generated from OpenAPI definitions |
| **Validation** | `@hono/zod-openapi` | Zod schemas with OpenAPI metadata |

**Key Benefits:**
- ✅ **Single source of truth**: One route definition serves both RPC and OpenAPI
- ✅ **No duplication**: Eliminates the need to maintain separate RPC and OpenAPI routes
- ✅ **Always in sync**: Documentation and types are always consistent
- ✅ **Reduced maintenance**: ~20% less code compared to dual-pattern approach

---

## Directory Structure

```
src/
├── schemas/                # ★ Shared Zod schemas (Base validation)
│   └── leagues.ts          # ★ Use z from 'zod' (for RPC validators)
│
├── types/                  # TypeScript type definitions
│   └── league.ts           # Interface definitions
│
└── server/
    ├── routes/             # ★ OpenAPI + RPC unified routes
    │   ├── index.ts        # ★ Use OpenAPIHono, export AppType
    │   ├── leagues.ts      # ★ Use OpenAPIHono + createRoute
    │   └── players.ts      # ★ Use OpenAPIHono + createRoute
    │
    ├── schemas/            # ★ OpenAPI schemas (with .openapi() metadata)
    │   ├── common.ts       # ★ Error response schemas
    │   ├── leagues.ts      # ★ League-related OpenAPI schemas
    │   └── players.ts      # ★ Player-related OpenAPI schemas
    │
    ├── services/           # Business logic (shared)
    │   └── leagues.ts
    │
    ├── repositories/       # Data access (shared)
    │   └── leagues.ts
    │
    ├── validators/         # ★ Legacy: being migrated to schemas/
    │   └── leagues.ts      # ★ TODO: Migrate to @/src/schemas
    │
    └── middleware/         # Auth, error handling
        ├── auth.ts
        └── error-handler.ts
```

### Key Points

- **`src/schemas/`**: Base Zod schemas for validators (plain `zod`)
- **`src/server/schemas/`**: OpenAPI-decorated schemas (`@hono/zod-openapi`)
- **`src/server/routes/`**: All routes use `OpenAPIHono` + `createRoute`
- **`src/server/validators/`**: Legacy directory, being phased out

---

## Import Rules

### ✅ CORRECT: Unified OpenAPI Pattern

```typescript
// ✅ Shared Base Schemas (src/schemas/*.ts)
import { z } from 'zod'

// ✅ OpenAPI Schemas (src/server/schemas/*.ts)
import { z } from '@hono/zod-openapi'

// ✅ Unified Routes (src/server/routes/*.ts)
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as leaguesService from '../services/leagues'
import {
  LeaguesResponseSchema,
  CreateLeagueRequestSchema,
  UnauthorizedResponse
} from '../schemas/leagues'
```

### Import Checklist

| File Type | Hono Import | Zod Import | Purpose |
|-----------|-------------|------------|---------|
| `src/schemas/**/*.ts` | N/A | `zod` | Base validation schemas |
| `src/server/schemas/**/*.ts` | N/A | `@hono/zod-openapi` | OpenAPI-decorated schemas |
| `src/server/routes/**/*.ts` | `OpenAPIHono` | `@hono/zod-openapi` | Unified route definitions |

---

## Routing Patterns

### Unified Route Definition Pattern

**File: `src/server/routes/index.ts`**

```typescript
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { errorHandler } from '../middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

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

// Mount route modules
const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/leagues', playersRoutes)  // Players routes are under /leagues/:leagueId/players

// ★ CRITICAL: Export AppType BEFORE adding doc routes
// This ensures RPC clients only see API endpoints, not documentation routes
export type AppType = typeof routes

// Add OpenAPI documentation endpoints
routes.doc('/doc', {
  openapi: '3.1.0',
  info: {
    version: '1.0.0',
    title: 'Kojiro Mahjong API',
    description: 'Mahjong league management application API',
  },
})

// Swagger UI endpoint
routes.get('/ui', swaggerUI({ url: '/api/doc' }))

export default routes
```

**File: `src/server/routes/leagues.ts`**

```typescript
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as leaguesService from '../services/leagues'
import {
  ForbiddenResponse,
  NotFoundResponse,
  UnauthorizedResponse,
} from '../schemas/common'
import {
  CreateLeagueRequestSchema,
  LeagueSchema,
  LeaguesResponseSchema,
  UpdateLeagueRequestSchema,
} from '../schemas/leagues'

const app = new OpenAPIHono<AuthContext>()

// Apply auth middleware to all routes
app.use('*', authMiddleware)

/**
 * GET /api/leagues - Get leagues list
 */
const getLeaguesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['leagues'],
  summary: 'Get leagues list',
  description: 'Get list of leagues the user participates in',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeaguesResponseSchema,
        },
      },
      description: 'Successfully retrieved leagues list',
    },
    401: UnauthorizedResponse,
  },
})

app.openapi(getLeaguesRoute, async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})

// ... more routes

export default app
```

### Next.js API Route Integration

**File: `app/api/[...route]/route.ts`**

```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import app from '@/src/server/routes'  // ★ Single unified app

// Mount unified app
const mainApp = new Hono().route('/', app)

export const GET = handle(mainApp)
export const POST = handle(mainApp)
export const PATCH = handle(mainApp)
export const DELETE = handle(mainApp)
```

---

## Validation

### OpenAPI Schemas (src/server/schemas/)

Define schemas with OpenAPI metadata:

```typescript
import { z } from '@hono/zod-openapi'

/**
 * Player role enum
 */
export const PlayerRoleSchema = z
  .enum(['admin', 'scorer', 'viewer'])
  .nullable()
  .openapi({
    description: 'Player role (null if no role assigned)',
    example: 'admin',
  })

/**
 * Create league request
 */
export const CreateLeagueRequestSchema = z
  .object({
    name: z.string().min(1).max(20).openapi({
      example: '2025 Spring League',
      description: 'League name (1-20 characters)',
    }),
    description: z.string().optional().openapi({
      example: 'Every Friday evening',
      description: 'League description (optional)',
    }),
    players: z
      .union([
        z.array(PlayerNameSchema).length(8),
        z.array(PlayerNameSchema).length(16),
      ])
      .openapi({
        description: 'List of players (must be exactly 8 or 16)',
      }),
  })
  .openapi('CreateLeagueRequest')
```

### Cross-validation Rules

Use `.refine()` for complex validation:

```typescript
.refine(
  (data) => data.playerNames.length === Number.parseInt(data.playerCount, 10),
  {
    message: 'playerNames length must match playerCount',
    path: ['playerNames'],
  }
)
```

---

## Type Safety

### Hono RPC Client Setup

**File: `src/client/api.ts`**

```typescript
import { hc } from 'hono/client'
import type { AppType } from '@/src/server/routes'  // ★ type-only import

export const apiClient = hc<AppType>('http://localhost:3000')
```

**Usage in React Query:**

```typescript
const res = await apiClient.api.leagues.$get()
const data = await res.json()  // ✅ Fully type-safe
```

### Context Type Safety

**Auth context definition:**

```typescript
// src/server/middleware/auth.ts
export type AuthContext = {
  Variables: {
    userId: string  // ★ NOT user object, just userId
  }
}

export const authMiddleware = async (c: Context<AuthContext>, next: Next) => {
  // ... validate JWT
  c.set('userId', user.id)  // ★ Set userId in context
  await next()
}
```

**Usage in routes:**

```typescript
import type { AuthContext } from '../middleware/auth'

const app = new OpenAPIHono<AuthContext>()

app.openapi(someRoute, async (c) => {
  const userId = c.get('userId')  // ✅ Type-safe: string
})
```

---

## Error Handling

### Service Layer Pattern

**Throw errors in service layer, NO try-catch in routes:**

```typescript
// ✅ Service layer (src/server/services/leagues.ts)
import { NotFoundError, ForbiddenError } from '../middleware/error-handler'

export async function deleteLeague(leagueId: string, userId: string) {
  const league = await findLeagueById(leagueId)
  if (!league) {
    throw new NotFoundError('League not found')
  }
  if (!hasAdminRole(league, userId)) {
    throw new ForbiddenError('Insufficient permissions')
  }
  await leaguesRepo.deleteLeague(leagueId)
}

// ✅ Route layer (NO try-catch needed)
app.openapi(deleteLeagueRoute, async (c) => {
  const userId = c.get('userId')
  const leagueId = c.req.param('id')
  await leaguesService.deleteLeague(leagueId, userId)  // Middleware catches errors
  return c.body(null, 204)
})
```

### Custom Error Classes

```typescript
// src/server/middleware/error-handler.ts
export class NotFoundError extends Error {
  statusCode = 404
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}
```

---

## Common Mistakes

### 1. ❌ Using Plain Hono Instead of OpenAPIHono

**Problem:**

```typescript
// ❌ src/server/routes/leagues.ts
import { Hono } from 'hono'  // WRONG!

const app = new Hono<AuthContext>()

app.get('/', async (c) => { ... })  // Missing OpenAPI metadata
```

**Solution:**

```typescript
// ✅ src/server/routes/leagues.ts
import { OpenAPIHono, createRoute } from '@hono/zod-openapi'

const app = new OpenAPIHono<AuthContext>()

const getLeaguesRoute = createRoute({ ... })  // With OpenAPI metadata
app.openapi(getLeaguesRoute, async (c) => { ... })
```

### 2. ❌ Exporting AppType After Doc Routes

**Problem:**

```typescript
// ❌ src/server/routes/index.ts
const routes = app.route('/leagues', leaguesRoutes)

routes.doc('/doc', { ... })
routes.get('/ui', swaggerUI({ ... }))

export type AppType = typeof routes  // WRONG! Includes /doc and /ui
```

**Solution:**

```typescript
// ✅ src/server/routes/index.ts
const routes = app.route('/leagues', leaguesRoutes)

// Export AppType BEFORE adding doc routes
export type AppType = typeof routes  // ✅ Only API endpoints

routes.doc('/doc', { ... })
routes.get('/ui', swaggerUI({ ... }))
```

### 3. ❌ Wrong Zod Import in OpenAPI Schemas

**Problem:**

```typescript
// ❌ src/server/schemas/leagues.ts
import { z } from 'zod'  // WRONG! Missing .openapi() method
```

**Solution:**

```typescript
// ✅ src/server/schemas/leagues.ts
import { z } from '@hono/zod-openapi'  // Has .openapi() method
```

### 4. ❌ Forgetting to Use AuthContext Type

**Problem:**

```typescript
// ❌ Type error: 'userId' doesn't exist
const app = new OpenAPIHono()

app.openapi(someRoute, async (c) => {
  const userId = c.get('userId')  // ❌ Type error
})
```

**Solution:**

```typescript
// ✅ Specify AuthContext
import type { AuthContext } from '../middleware/auth'

const app = new OpenAPIHono<AuthContext>()

app.openapi(someRoute, async (c) => {
  const userId = c.get('userId')  // ✅ Type-safe
})
```

---

## Checklist Before Committing

- [ ] All routes use `OpenAPIHono`, NOT plain `Hono`
- [ ] All routes define OpenAPI metadata with `createRoute()`
- [ ] All routes use `app.openapi()`, NOT `app.get/post/patch/delete()`
- [ ] OpenAPI schemas use `@hono/zod-openapi` with `.openapi()` decorators
- [ ] `src/server/routes/index.ts` exports `AppType` BEFORE doc routes
- [ ] All routes use `AuthContext` type
- [ ] Service layer throws custom errors, routes don't use try-catch
- [ ] TypeScript compilation passes: `bunx tsc --noEmit`
- [ ] Lint passes: `bun run lint:fix`

---

## References

- [Hono RPC Documentation](https://hono.dev/guides/rpc)
- [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [Project CLAUDE.md](../CLAUDE.md)
- [Issue #45: RPC/OpenAPI Unification](https://github.com/your-repo/issues/45)

---

**Last Updated:** 2025-11-28
