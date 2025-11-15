# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kojiro Mahjong App - A mahjong league management application built with Next.js App Router, Hono, Drizzle ORM, and Supabase.

## Development Commands

### Setup and Running
```bash
bun install                # Install dependencies
bun run dev                # Start Next.js dev server (localhost:3000)
bunx supabase start        # Start Supabase local instance
bunx supabase stop         # Stop Supabase local instance
```

### Code Quality
```bash
bun run lint               # Check code with Biome (summary report)
bun run lint:fix           # Auto-fix issues with Biome
bun run format             # Format code with Biome
```

### Database (Drizzle + Supabase)
```bash
bun run db:generate        # Generate migration SQL from schema changes
bun run db:migrate         # Apply migrations to database
bun run db:push            # Push schema directly to DB (local dev only)
bun run db:studio          # Launch Drizzle Studio UI
```

**Important**: Schema files live in `db/schema/`. After modifying schema, run `db:generate` to create migrations, then `db:migrate` to apply them.

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, React Query (TanStack Query)
- **Backend**: Hono (API framework) with dual API patterns (RPC + OpenAPI)
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **Auth**: Supabase Auth (JWT Bearer tokens)
- **Validation**: Zod schemas
- **Linting/Formatting**: Biome
- **Git Hooks**: Lefthook

### Project Structure

```
app/
  api/[...route]/route.ts    # Next.js API route - mounts Hono apps
  layout.tsx, page.tsx       # App Router pages

src/
  client/
    api.ts                   # Hono RPC client (hc) setup
    hooks/                   # React Query hooks (e.g., useLeagues)

  server/
    routes/                  # Hono RPC routes (type-safe endpoints)
      index.ts               # Main RPC app, exports AppType
      leagues.ts, players.ts # Feature-specific routes

    openapi/                 # Hono OpenAPI routes (documented endpoints)
      index.ts               # OpenAPI app, Swagger UI at /api/ui
      routes/                # OpenAPI route definitions
      schemas/               # Zod OpenAPI schemas

    services/                # Business logic layer
    repositories/            # Database access layer (Drizzle queries)
    validators/              # Zod validation schemas
    middleware/
      auth.ts                # JWT auth middleware (Supabase)
      error-handler.ts       # Global error handling

db/
  schema/                    # Drizzle schema definitions
    index.ts                 # Exports all schemas
    leagues.ts, players.ts, etc.
  index.ts                   # Drizzle client initialization

drizzle/                     # Generated migrations
```

### Dual API Pattern

This project uses **two parallel Hono apps** mounted at the same base path (`/api`):

1. **RPC API** (`src/server/routes/`): Type-safe client-server communication
   - Uses `hono/client` (hc) for end-to-end type safety
   - Client: `src/client/api.ts` exports `apiClient` typed with `AppType`
   - Used by React Query hooks for frontend data fetching

2. **OpenAPI API** (`src/server/openapi/`): Documented REST API
   - Uses `@hono/zod-openapi` for OpenAPI 3.1 spec generation
   - Swagger UI available at `/api/ui`
   - OpenAPI spec at `/api/doc`
   - Shares business logic (services/repositories) with RPC API

Both apps are mounted in `app/api/[...route]/route.ts` and share the same error handler and middleware.

### Layered Architecture Pattern

**Routes ’ Services ’ Repositories ’ Database**

- **Routes**: Handle HTTP concerns (validation, auth middleware, response formatting)
- **Services**: Business logic, authorization checks (e.g., admin role verification)
- **Repositories**: Database queries using Drizzle ORM
- **Database**: PostgreSQL via Supabase, accessed through Drizzle (`db/index.ts`)

Example flow for GET `/api/leagues`:
```
routes/leagues.ts (auth + validation)
  ’ services/leagues.ts (business logic)
    ’ repositories/leagues.ts (Drizzle query)
      ’ db/index.ts (Drizzle client)
```

### Authentication Flow

- Supabase Auth provides JWT tokens
- Frontend includes `Authorization: Bearer <token>` header
- `authMiddleware` validates token via Supabase client
- User ID is set in Hono context: `c.get('userId')`
- Services use userId for authorization checks (e.g., admin role, league participation)

### Database Schema Key Points

- Schema defined in `db/schema/*.ts` using Drizzle
- Relations: `leaguesTable` ” `playersTable` ” `usersTable`
- Soft deletes: `status = 'deleted'` (not hard delete)
- First player in league creation becomes admin (see `repositories/leagues.ts:26-31`)

### Frontend Data Fetching

- React Query hooks in `src/client/hooks/` use Hono RPC client
- Example: `useLeagues` fetches from `apiClient.api.leagues.$get()`
- Type safety ensured via `AppType` export from `src/server/routes/index.ts`

## Environment Variables

Required in `.env` or `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string (Supabase local: run `bunx supabase status`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Never commit `.env` or `.env.local`** - they're gitignored.

## Code Quality Standards

- **Biome** handles both linting and formatting
- **Lefthook** runs `lint:fix` on staged files pre-commit
- Use `bun run lint:fix` before committing to auto-fix safe issues
- TypeScript strict mode enabled

## Common Patterns

### Adding a New Feature

1. **Define schema** in `db/schema/*.ts`
2. **Generate migration**: `bun run db:generate`
3. **Apply migration**: `bun run db:migrate`
4. **Create repository** in `src/server/repositories/` (Drizzle queries)
5. **Create service** in `src/server/services/` (business logic)
6. **Create validator** in `src/server/validators/` (Zod schemas)
7. **Add RPC route** in `src/server/routes/*.ts`
8. **(Optional) Add OpenAPI route** in `src/server/openapi/routes/*.ts`
9. **Create React Query hook** in `src/client/hooks/`
10. **Use in components** via the hook

### Error Handling

- Services throw typed errors: `NotFoundError`, `ForbiddenError`, `BadRequestError`
- Defined in `src/server/middleware/error-handler.ts`
- Global error handler converts to appropriate HTTP responses
- Example: `throw new ForbiddenError('SnÍ\’ŸLY‹)PLBŠ~[“')`

### Database Transactions

Use `db.transaction()` for multi-step operations:
```typescript
return await db.transaction(async (tx) => {
  const [league] = await tx.insert(leaguesTable).values(...).returning()
  const players = await tx.insert(playersTable).values(...).returning()
  return { ...league, players }
})
```

See `repositories/leagues.ts:14-40` for reference.

## API Documentation

- Swagger UI: `http://localhost:3000/api/ui` (when dev server is running)
- OpenAPI spec: `http://localhost:3000/api/doc`
- Only OpenAPI routes appear in Swagger (RPC routes are client-only)
