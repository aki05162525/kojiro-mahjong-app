# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts Next.js App Router entry points (e.g., `app/api/[...route]/route.ts`) and should only import from `src/` to avoid leaking server logic into React bundles.
- `src/` contains domain code: `src/server/routes/**` for Hono handlers, `src/server/services/**` for pure business logic, and `src/server/repositories/**` for Drizzle queries. Add new routes via `src/server/routes/index.ts`.
- `db/` holds Drizzle setup plus `db/schema/**` definitions; `drizzle/` stores generated migrations.
- `docs/` captures product specs and task logs—update the relevant task file whenever you change behavior so future agents understand the rationale.
- Shared assets live alongside their feature folders; avoid ad-hoc duplicate structures.

## Build, Test, and Development Commands
- `bun install` installs dependencies (Bun is the default runtime—do not mix npm or yarn).
- `bun run dev` starts the Next.js dev server and the embedded Hono API.
- `bun run build && bun run start` compiles and serves the production bundle.
- `bun run lint` / `bun run lint:fix` run Biome checks and optionally auto-fix style issues.
- Database flows: `bun run db:generate`, `bun run db:migrate --config drizzle.config.ts`, and `bun run db:studio`.

## Coding Style & Naming Conventions
- TypeScript everywhere with explicit return types on exported functions.
- Follow Biome defaults: two-space indent, single quotes, no semicolons unless required.
- Use dashed kebab-case for files (`players.ts`), camelCase for functions, PascalCase for React components.
- Keep server code functional—prefer `export async function` modules instead of classes.

## Testing Guidelines
- There is no automated suite yet; verify endpoints manually via `bun run dev` plus `curl` commands described in `docs/*-tasks.md`.
- Document any manual verification steps (request, payload, response) in your PR description.
- For database changes, run `bun run db:generate` and `bun run db:migrate --config drizzle.config.ts` against a local Postgres instance before publishing.

## Commit & Pull Request Guidelines
- Follow conventional commits seen in history (`feat(scope): ...`, `fix: ...`, `chore: ...`); keep each commit focused.
- Ensure `bun run lint` passes before pushing.
- PRs should outline the problem, summarize the solution, include screenshots or sample API responses, link to tasks/issues, and list manual test evidence (commands + results).

## Security & Configuration Tips
- Never commit secrets; store `NEXT_PUBLIC_SUPABASE_*` and `DATABASE_URL` in `.env.local` and read via `process.env`.
- Rotate Supabase keys for shared environments and log temporary credentials inside the relevant doc under `docs/`.
