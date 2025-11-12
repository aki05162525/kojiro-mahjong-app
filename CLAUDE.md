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

**Planned directory structure (not yet implemented):**
- `src/server/routes/` - Hono route definitions
- `src/server/services/` - Business logic layer
- `src/server/repositories/` - Database access layer
- `src/server/middleware/` - Auth and error handling
- `src/server/validators/` - Zod validators

### Frontend: Hono RPC Client + React Query

```
Component → React Query Hook → Hono RPC Client → API
```

**Planned directory structure (not yet implemented):**
- `src/client/api.ts` - Hono RPC client initialization
- `src/client/hooks/` - React Query hooks

### Current API Entry Point

`app/api/[...route]/route.ts` - Hono app with `/api` basePath

## Hono RPC Type Safety Pattern

**Critical for end-to-end type safety:**

1. **Export AppType** (`src/server/routes/index.ts`):
```typescript
const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/players', playersRoutes)
  // Chain ALL routes in ONE expression

export type AppType = typeof routes  // Must be from chained routes
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

**Authentication:**
- Uses Supabase Auth (JWT)
- All endpoints require authentication (marked with 🔒 in docs)

**Validation:**
- Use Zod validators in `src/server/validators/`
- League names: 1-20 characters
- Player names: 1-20 characters
- Player count: must be exactly 8 or 16

**Error responses:**
```typescript
{
  error: string,      // Error type
  message: string,    // User-friendly message
  statusCode: number  // HTTP status code
}
```

**League creation transaction:**
- Must create league + all players in a single transaction
- First player (index 0) is automatically linked to creator with `role: admin`

**Authorization pattern:**
- Check for `admin` role in Service layer before allowing:
  - League updates/deletion
  - Status changes
  - Player management (name/role updates)

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

### Planned Endpoints (Issue #22)

**League Management:**
- `POST /api/leagues` - Create league
- `GET /api/leagues` - List user's leagues
- `GET /api/leagues/:id` - Get league details
- `PATCH /api/leagues/:id` - Update league
- `DELETE /api/leagues/:id` - Logical delete (set status to 'deleted')
- `PATCH /api/leagues/:id/status` - Change status

**Player Management:**
- `PATCH /api/leagues/:id/players/:playerId` - Update player name
- `PATCH /api/leagues/:id/players/:playerId/role` - Change player role (admin only)

## Documentation References

- `docs/api-design.md` - Complete API specification
- `docs/directory-structure.md` - Hono RPC architecture guide
- `docs/issues/issue-06-implement-league-api.md` - Current implementation tasks
- [Hono RPC Documentation](https://hono.dev/guides/rpc)

## Development Workflow

1. Database changes: Update `db/schema/`, run `bun run db:generate`, then `bun run db:push`
2. API implementation: Follow 3-layer pattern (Route → Service → Repository)
3. Type safety: Always chain routes in one expression for RPC type inference
4. Validation: Define Zod schemas in `validators/` before implementing routes
5. Testing: Use Drizzle Studio (`bun run db:studio`) for database inspection
