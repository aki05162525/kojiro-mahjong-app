# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A mahjong league management application built with Next.js 15, Hono (for API), Drizzle ORM, and Supabase Auth. The app manages leagues with 8 or 16 players, tracks game sessions (節/setsus), table assignments, scoring, and rankings.

## Development Commands

```bash
# Installation
bun install

# Development
bun run dev          # Start Next.js dev server (localhost:3000)

# Code Quality
bun run lint         # Biome check (reporter summary)
bun run lint:fix     # Biome check with auto-fixes
bun run format       # Biome format

# Database (Drizzle + Supabase)
bun run db:generate  # Generate migrations from schema
bun run db:migrate   # Run migrations
bun run db:push      # Push schema changes directly
bun run db:studio    # Open Drizzle Studio
```

## Architecture

### Backend: 3-Layer Architecture with Hono RPC

```
Route (Hono) → Service (Business Logic) → Repository (Data Access) → Database (Drizzle ORM)
```

**Directory structure:**
- `src/server/routes/` - Hono route definitions (function-based)
- `src/server/services/` - Business logic layer (function-based)
- `src/server/repositories/` - Database access layer (function-based)
- `src/server/middleware/` - Auth and error handling
- `src/server/validators/` - Zod validators

**Architecture style:** Function-based (not class-based)
- Use `export async function` pattern for all layers
- Example: `export async function createLeague(userId, data) { ... }`

### Frontend: Hono RPC Client + React Query (Planned)

```
Component → React Query Hook → Hono RPC Client → API
```

**Planned directory structure:**
- `src/client/api.ts` - Hono RPC client initialization
- `src/client/hooks/` - React Query hooks

### API Entry Points

1. **Route assembly:** `src/server/routes/index.ts` - Chains all route handlers
2. **Next.js handler:** `app/api/[...route]/route.ts` - Calls `handle(app)` from hono/vercel

## Hono RPC Type Safety Pattern

**Critical for end-to-end type safety:**

1. **Route assembly in `src/server/routes/index.ts`:**
   - Import all route handlers
   - Chain them in ONE expression and assign to `routes`
   - Export `AppType` from `routes` (not from `app`)
   - Export `routes` as default (not `app`)

```typescript
import { Hono } from 'hono'
import leaguesRoutes from './leagues'
import playersRoutes from './players'

const app = new Hono().basePath('/api')

// ★ Chain ALL routes in ONE expression
const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/leagues', playersRoutes)

// ★ Export type from chained routes
export type AppType = typeof routes

// ★ Export routes as default (not app)
export default routes
```

2. **RPC Client** (`src/client/api.ts`):
```typescript
import { hc } from 'hono/client'
import type { AppType } from '@/src/server/routes'  // type-only import

export const apiClient = hc<AppType>('http://localhost:3000')
```

3. **Usage in React Query**:
```typescript
const res = await apiClient.api.leagues.$get()
const data = await res.json()  // Fully type-safe
```

## Database Schema Architecture

**Location:** `db/schema/` (Drizzle ORM)

**Key tables:**
- `leagues` - League metadata (8 or 16 players only)
- `players` - Players in a league (fixed count, no addition/removal after creation)
  - Has optional `user_id` (can be linked later)
  - Has `role` enum: `admin`, `scorer`, `viewer`, or `null`
- `sessions` - Game sessions (節/setsus)
- `tables` - Individual mahjong tables within sessions
- `scores` - Score records per player per table
- `users` - Supabase Auth users
- `link_requests` - Player-user linking requests

**Important constraints:**
- League must have exactly 8 or 16 players (validated at creation)
- Players cannot be added/removed after league creation (only name edits allowed)
- Only players with `user_id` can have roles assigned

**Database connection:** `db/index.ts` exports `db` instance (Drizzle with postgres.js)

## Code Style and Linting

**Formatter:** Biome (not Prettier)
- Single quotes for JS/TS, double quotes for JSX
- 2-space indentation
- Line width: 100
- Trailing commas: all
- Semicolons: as-needed

**Git Hooks (Lefthook):**
- Pre-commit: Runs `bun run lint:fix` on staged files
- Pre-push: Runs `bun run lint`

**TypeScript:**
- `strict: true`
- Path alias: `@/*` → project root

## API Design Principles

### Authentication & Context

**Middleware:** `src/server/middleware/auth.ts`
- Uses Supabase Auth (JWT validation)
- All API endpoints require authentication
- Sets `userId` in context: `c.set('userId', data.user.id)`
- In routes, retrieve with: `const userId = c.get('userId')`
- ⚠️ **Important:** Context has `userId` (string), NOT `user` (object)

### Error Handling

**Custom error classes** (`src/server/middleware/error-handler.ts`):
- `NotFoundError` - 404 errors
- `ForbiddenError` - 403 errors
- Throw these in service layer, middleware handles response

**Error response format:**
```typescript
{
  error: string,      // Error type
  message: string,    // User-friendly message
  statusCode: number  // HTTP status code
}
```

**Pattern:** Service layer throws errors, no try-catch needed in routes
```typescript
// Service layer
export async function deleteLeague(leagueId: string, userId: string) {
  const league = await findLeagueById(leagueId)
  if (!league) throw new NotFoundError('リーグが見つかりません')
  if (!hasAdminRole(league, userId)) throw new ForbiddenError('権限がありません')
  // ...
}

// Route layer (no try-catch needed)
app.delete('/:id', async (c) => {
  const userId = c.get('userId')
  await leaguesService.deleteLeague(id, userId)
  return c.body(null, 204)
})
```

### Validation

- Use Zod validators in `src/server/validators/`
- League names: 1-20 characters
- Player names: 1-20 characters
- Player count: must be exactly 8 or 16
- League status: `'active' | 'completed' | 'deleted'` (no 'planning')

### Business Logic Patterns

**League creation transaction:**
- Must create league + all players in a single transaction
- First player (index 0) is automatically linked to creator with `role: admin`

**Authorization pattern:**
- Check for `admin` role in Service layer before allowing:
  - League updates/deletion
  - Status changes
  - Player management (name/role updates)
- Helper function: `hasAdminRole(league, userId)` checks if user has admin role

## Key Implementation Notes

### Player vs User Distinction
- **Players:** People who play mahjong in a league (8 or 16 per league)
  - Can exist without being app users (`user_id` can be `null`)
  - Fixed count at league creation
- **Users:** Authenticated app users (Supabase Auth)
- Players can be linked to users later via link requests

### Session (節/Setsu) System
- First session: All tables are `first` rank, players randomly assigned
- Subsequent sessions: Tables ranked by performance (上卓/下卓), players redistributed

### Implemented Endpoints

**League Management** (src/server/routes/leagues.ts):
- ✅ `POST /api/leagues` - Create league
- ✅ `GET /api/leagues` - List user's leagues
- ✅ `GET /api/leagues/:id` - Get league details
- ✅ `PATCH /api/leagues/:id` - Update league
- ✅ `DELETE /api/leagues/:id` - Logical delete (set status to 'deleted')
- ✅ `PATCH /api/leagues/:id/status` - Change status

**Player Management** (planned):
- ⏳ `PATCH /api/leagues/:id/players/:playerId` - Update player name
- ⏳ `PATCH /api/leagues/:id/players/:playerId/role` - Change player role (admin only)

## Documentation References

- `docs/api-design.md` - Complete API specification
- `docs/directory-structure.md` - Hono RPC architecture guide
- `docs/issues/issue-22-implement-league-api.md` - API implementation roadmap
- `docs/step3-remaining-endpoints-tasks.md` - Current implementation tasks
- [Hono RPC Documentation](https://hono.dev/guides/rpc)

## Development Workflow

### Adding New API Endpoints

1. **Validator** (`src/server/validators/`): Define Zod schemas
2. **Repository** (`src/server/repositories/`): Add database access functions
3. **Service** (`src/server/services/`): Implement business logic
4. **Route** (`src/server/routes/`): Define HTTP endpoints
5. **Route Assembly** (`src/server/routes/index.ts`): Chain new route to `routes`

### Database Schema Changes

1. Update schema in `db/schema/`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate` or `bun run db:push` (local)
4. Verify with Drizzle Studio: `bun run db:studio`

### Code Quality

- Run `bun run lint` before committing
- Pre-commit hook auto-runs `bun run lint:fix` on staged files
- Pre-push hook runs `bun run lint` on all files
