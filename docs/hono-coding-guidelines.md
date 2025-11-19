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

### Two Parallel Hono Apps

This project maintains **two separate Hono applications** for different purposes:

| App | Purpose | Technology | Consumers |
|-----|---------|------------|-----------|
| **RPC App** | Type-safe frontend-backend communication | `Hono` + Hono RPC | React Query hooks |
| **OpenAPI App** | API documentation and external clients | `OpenAPIHono` | Swagger UI, SDK generators, external apps |

**Critical Rule:** These two apps must **never** mix their technologies. Keep them completely separate.

---

## Directory Structure

```
src/
├── schemas/                # ★ Shared Zod schemas (NEW)
│   └── leagues.ts          # ★ Use z from 'zod' (common for RPC & OpenAPI)
│
├── types/                  # TypeScript type definitions
│   └── league.ts           # Interface definitions
│
└── server/
    ├── routes/             # Hono RPC App (frontend use)
    │   ├── index.ts        # ★ Use Hono, export AppType
    │   ├── leagues.ts      # ★ Use Hono, import from @/src/schemas
    │   └── players.ts      # ★ Use Hono, import from @/src/schemas
    │
    ├── openapi/            # OpenAPI App (documentation, external clients)
    │   ├── index.ts        # ★ Use OpenAPIHono, mount /doc and /ui
    │   ├── schemas/        # ★ Use z from '@hono/zod-openapi'
    │   │   ├── common.ts
    │   │   └── leagues.ts  # ★ Import base schemas from @/src/schemas
    │   └── routes/         # ★ Use OpenAPIHono, createRoute
    │       └── leagues.ts
    │
    ├── services/           # Business logic (shared by both)
    │   └── leagues.ts
    │
    ├── repositories/       # Data access (shared by both)
    │   └── leagues.ts
    │
    └── middleware/         # Auth, error handling (shared by both)
        ├── auth.ts
        └── error-handler.ts
```

### Key Points

- **`src/schemas/`**: Shared base Zod schemas for frontend & backend validation
- **`src/types/`**: Shared TypeScript types (interfaces, not Zod)
- **`src/server/routes/`**: Pure Hono RPC, imports from `@/src/schemas`
- **`src/server/openapi/`**: Pure OpenAPI, extends base schemas with `.openapi()` decorators
- **`src/server/services/`**: Shared business logic (function-based, not class-based)

---

## Import Rules

### ❌ WRONG: Mixing imports

```typescript
// ❌ In RPC routes (src/server/routes/)
import { OpenAPIHono } from '@hono/zod-openapi'  // NEVER use OpenAPIHono in RPC routes

// ❌ In RPC validators (src/server/validators/)
import { z } from '@hono/zod-openapi'  // NEVER use @hono/zod-openapi in validators
```

### ✅ CORRECT: Proper imports

```typescript
// ✅ Shared Schemas (src/schemas/*.ts)
import { z } from 'zod'

// ✅ RPC Routes (src/server/routes/*.ts)
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createLeagueSchema } from '@/src/schemas/leagues'

// ✅ OpenAPI Schemas (src/server/openapi/schemas/*.ts)
import { z } from '@hono/zod-openapi'
import { createLeagueSchema } from '@/src/schemas/leagues'  // Base schema

// ✅ OpenAPI Routes (src/server/openapi/routes/*.ts)
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
```

### Import Checklist

| File Type | Hono Import | Zod Import | Base Schemas |
|-----------|-------------|------------|--------------|
| `src/schemas/**/*.ts` | N/A | `zod` | N/A |
| `src/server/routes/**/*.ts` | `Hono` | N/A | `@/src/schemas` |
| `src/server/openapi/schemas/**/*.ts` | N/A | `@hono/zod-openapi` | `@/src/schemas` |
| `src/server/openapi/routes/**/*.ts` | `OpenAPIHono` | `@hono/zod-openapi` | N/A |
| `src/server/openapi/index.ts` | `OpenAPIHono` | `@hono/zod-openapi` | N/A |

---

## Routing Patterns

### RPC Route Definition Pattern

**File: `src/server/routes/index.ts`**

```typescript
import { Hono } from 'hono'
import { errorHandler } from '../middleware/error-handler'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

const app = new Hono().basePath('/api')

// Register error handler
app.onError(errorHandler)

// Chain routes and assign to routes
const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/players', playersRoutes)

// ★ CRITICAL: Export AppType from routes, not app
export type AppType = typeof routes

// ★ CRITICAL: Export routes as default, not app
export default routes
```

**File: `src/server/routes/leagues.ts`**

```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createLeagueSchema } from '@/src/schemas/leagues'
import type { AuthContext } from '../middleware/auth'
import { authMiddleware } from '../middleware/auth'
import * as leaguesService from '../services/leagues'

const app = new Hono<AuthContext>()
  // Apply auth middleware once at the top
  .use('*', authMiddleware)
  // ⚠️ Always chain handlers so Hono RPC can infer schema (do NOT call methods separately)
  .get('/', async (c) => {
    const userId = c.get('userId')
    const result = await leaguesService.getLeaguesByUserId(userId)
    return c.json(result, 200)
  })
  .post('/', zValidator('json', createLeagueSchema), async (c) => {
    const userId = c.get('userId')
    const data = c.req.valid('json')
    const league = await leaguesService.createLeague(userId, data)
    return c.json(league, 201)
  })

export default app
```

### OpenAPI Route Definition Pattern

**File: `src/server/openapi/index.ts`**

```typescript
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

// OpenAPI spec endpoint
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
```

**File: `src/server/openapi/routes/leagues.ts`**

```typescript
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { AuthContext } from '../../middleware/auth'
import { authMiddleware } from '../../middleware/auth'
import * as leaguesService from '../../services/leagues'
import { LeaguesResponseSchema, UnauthorizedResponse } from '../schemas/leagues'

const app = new OpenAPIHono<AuthContext>()

app.use('*', authMiddleware)

// Define route with createRoute
const getLeaguesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['leagues'],
  summary: 'Get leagues list',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: LeaguesResponseSchema,
        },
      },
      description: 'Successfully retrieved leagues',
    },
    401: UnauthorizedResponse,
  },
})

// Implement with app.openapi()
app.openapi(getLeaguesRoute, async (c) => {
  const userId = c.get('userId')
  const result = await leaguesService.getLeaguesByUserId(userId)
  return c.json(result, 200)
})

export default app
```

### Next.js API Route Integration

**File: `app/api/[...route]/route.ts`**

```typescript
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import openapiApp from '@/src/server/openapi'
import rpcApp from '@/src/server/routes'

// Create main app
const app = new Hono()

// ★ CRITICAL: Mount RPC app FIRST
app.route('/', rpcApp)

// ★ Mount OpenAPI app SECOND
app.route('/', openapiApp)

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)
```

**Important:** The mounting order and route resolution:

1. **Hono resolves routes in registration order**: When a request matches multiple handlers, Hono uses the first one registered
2. **Mount RPC app first**: Business logic endpoints (like `POST /api/leagues`) are handled by RPC app
3. **Mount OpenAPI app second**: OpenAPI-only routes (`/api/doc`, `/api/ui`) fall through from RPC app since they're not defined there
4. **Avoid duplicate routes**: If both apps define the same route, the RPC handler will always be used. Keep API contracts identical (same payload schemas) between both apps

---

## Validation

### Shared Base Schemas (src/schemas/)

Define base validation schemas with detailed error messages:

```typescript
import { z } from 'zod'

const playerNameSchema = z.object({
  name: z
    .string()
    .min(1, 'Player name is required')
    .max(20, 'Player name must be 20 characters or less'),
})

export const createLeagueSchema = z.object({
  name: z.string().min(1, 'League name is required').max(20, 'League name must be 20 characters or less'),
  description: z.string().optional(),
  players: z.union([
    z.array(playerNameSchema).length(8),
    z.array(playerNameSchema).length(16),
  ]),
})
```

### RPC Validation (src/server/routes/)

Import and use base schemas directly:

```typescript
import { zValidator } from '@hono/zod-validator'
import { createLeagueSchema } from '@/src/schemas/leagues'

app.post('/', zValidator('json', createLeagueSchema), async (c) => {
  // Validation happens automatically
})
```

### OpenAPI Validation (src/server/openapi/schemas/)

Extend base schemas with `.openapi()` metadata:

```typescript
import { z } from '@hono/zod-openapi'
import { createLeagueSchema } from '@/src/schemas/leagues'

export const CreateLeagueRequestSchema = createLeagueSchema
  .extend({
    name: z.string().min(1).max(20).openapi({
      example: '2025 Spring League',
      description: 'League name (1-20 characters)',
    }),
    // Add OpenAPI metadata for other fields...
  })
  .openapi('CreateLeagueRequest')
```

**Key Differences:**

| Feature | Base Schemas | RPC Routes | OpenAPI Schemas |
|---------|-------------|-----------|-----------------|
| Location | `src/schemas/` | `src/server/routes/` | `src/server/openapi/schemas/` |
| Import | `zod` | `@/src/schemas` | `@hono/zod-openapi` + `@/src/schemas` |
| Error messages | User-friendly | Inherit from base | API-focused |
| Examples | Not needed | Not needed | Required via `.openapi()` |
| Descriptions | Not needed | Not needed | Required via `.openapi()` |
| Usage | Define | Use as-is | Extend with `.openapi()` |

### Cross-validation Rules

Use `.refine()` for complex validation that spans multiple fields:

```typescript
.refine(
  (data) => data.playerNames.length === Number.parseInt(data.playerCount, 10),
  {
    message: 'playerNames length must match playerCount',
    path: ['playerNames'],  // Error will be attached to this field
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

const app = new Hono<AuthContext>()

app.get('/', async (c) => {
  const userId = c.get('userId')  // ✅ Type-safe: string
  // ❌ DON'T: const user = c.get('user') - doesn't exist
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
app.delete('/:id', async (c) => {
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

### Error Response Format

```typescript
{
  "error": "NotFoundError",
  "message": "League not found",
  "statusCode": 404
}
```

---

## Common Mistakes

### 1. ❌ Mixing RPC and OpenAPI Code

**Problem:**

```typescript
// ❌ src/server/routes/index.ts
import { OpenAPIHono } from '@hono/zod-openapi'  // WRONG!
import { swaggerUI } from '@hono/swagger-ui'     // WRONG!

const app = new OpenAPIHono().basePath('/api')   // WRONG!

app.doc('/doc', { ... })                         // WRONG!
app.get('/ui', swaggerUI({ ... }))               // WRONG!
```

**Solution:**

```typescript
// ✅ src/server/routes/index.ts
import { Hono } from 'hono'  // Use regular Hono

const app = new Hono().basePath('/api')
// NO OpenAPI code here!

export default app
```

### 2. ❌ Wrong Zod Import in Base Schemas

**Problem:**

```typescript
// ❌ src/schemas/leagues.ts
import { z } from '@hono/zod-openapi'  // WRONG!
```

**Solution:**

```typescript
// ✅ src/schemas/leagues.ts
import { z } from 'zod'  // Use standard zod (not OpenAPI version)
```

### 3. ❌ Exporting App Instead of Routes

**Problem:**

```typescript
// ❌ src/server/routes/index.ts
const app = new Hono().basePath('/api')
const routes = app.route('/leagues', leaguesRoutes)

export type AppType = typeof app  // WRONG! Loses basePath
export default app                // WRONG!
```

**Solution:**

```typescript
// ✅ src/server/routes/index.ts
const app = new Hono().basePath('/api')
const routes = app.route('/leagues', leaguesRoutes)

export type AppType = typeof routes  // ✅ Includes basePath
export default routes                // ✅ Export routes
```

### 4. ❌ Missing Validation in OpenAPI

**Problem:**

```typescript
// ❌ Allows any playerNames length, even if playerCount is 8
export const CreateLeagueRequestSchema = z.object({
  playerCount: z.enum(['8', '16']),
  playerNames: z.array(z.string()),  // No length validation!
})
```

**Solution:**

```typescript
// ✅ Enforce playerNames.length === playerCount
export const CreateLeagueRequestSchema = z
  .object({
    playerCount: z.enum(['8', '16']),
    playerNames: z.array(z.string()),
  })
  .refine((data) => data.playerNames.length === Number.parseInt(data.playerCount, 10), {
    message: 'playerNames length must match playerCount',
    path: ['playerNames'],
  })
```

### 5. ❌ Wrong Route Mounting Order

**Problem:**

```typescript
// ❌ app/api/[...route]/route.ts
const app = new Hono()
app.route('/', openapiApp)  // OpenAPI first
app.route('/', rpcApp)      // RPC second

// Result: Business endpoints (POST /api/leagues) are handled by OpenAPI app,
// but the RPC client expects them from RPC app, breaking type safety
```

**Solution:**

```typescript
// ✅ app/api/[...route]/route.ts
const app = new Hono()
app.route('/', rpcApp)      // RPC first: handles business logic endpoints
app.route('/', openapiApp)  // OpenAPI second: handles /doc, /ui (not in RPC)
```

### 6. ❌ Forgetting to Use AuthContext Type

**Problem:**

```typescript
// ❌ Type error: 'userId' doesn't exist
const app = new Hono()

app.get('/', async (c) => {
  const userId = c.get('userId')  // ❌ Type error
})
```

**Solution:**

```typescript
// ✅ Specify AuthContext
import type { AuthContext } from '../middleware/auth'

const app = new Hono<AuthContext>()

app.get('/', async (c) => {
  const userId = c.get('userId')  // ✅ Type-safe
})
```

---

## Checklist Before Committing

- [ ] Base schemas in `src/schemas/` use `zod`, NOT `@hono/zod-openapi`
- [ ] RPC routes import schemas from `@/src/schemas/`, NOT `../validators/`
- [ ] RPC routes use `Hono`, NOT `OpenAPIHono`
- [ ] OpenAPI schemas extend base schemas with `.openapi()` decorators
- [ ] OpenAPI schemas use `@hono/zod-openapi` for decorators only
- [ ] `src/server/routes/index.ts` exports `AppType` from `routes`, not `app`
- [ ] No OpenAPI code (`app.doc()`, `swaggerUI()`) in `src/server/routes/`
- [ ] Route mounting order: RPC first, OpenAPI second
- [ ] All routes use `AuthContext` type
- [ ] Complex validation uses `.refine()`
- [ ] Service layer throws custom errors, routes don't use try-catch
- [ ] TypeScript compilation passes: `bunx tsc --noEmit`
- [ ] Lint passes: `bun run lint:fix`

---

## References

- [Hono RPC Documentation](https://hono.dev/guides/rpc)
- [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi)
- [Project CLAUDE.md](../CLAUDE.md)
- [Issue #30 Implementation Tasks](./issue-30-openapi-implementation-tasks.md)

---

**Last Updated:** 2025-01-15
