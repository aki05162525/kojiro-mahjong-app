# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the Next.js App Router entry points (e.g., `app/api/[...route]/route.ts`) and should only import from `src/` to keep server code isolated.
- `src/` contains domain logic (`src/server/**` for Hono routes, services, repositories, validators, middleware). Keep new APIs under `src/server/routes` and wire them up via `src/server/routes/index.ts`.
- `db/` stores Drizzle ORM setup (`db/index.ts`, `db/schema/**`, `drizzle/` migrations). Use the existing schema exports instead of redefining models.
- `docs/` captures design specs and task breakdowns; update the relevant step file when changing behavior so future agents can align with product decisions.

## Build, Test, and Development Commands
- `bun install` — install dependencies (Bun is the default runtime; avoid mixing npm/yarn).
- `bun run dev` — start the Next.js dev server plus Hono API handler.
- `bun run build && bun run start` — compile the production bundle and serve it locally.
- `bun run lint` / `bun run lint:fix` — run Biome checks (formatting + lint) and optionally apply fixes.
- `bun run db:generate | db:migrate | db:studio` — manage Drizzle migrations or inspect the schema.

## Coding Style & Naming Conventions
- TypeScript everywhere; prefer explicit return types for exported functions.
- Follow Biome defaults: two-space indent, single quotes via lint autofix, no semicolons unless required.
- Organize server code as pure functions (`export async function`) rather than classes, mirroring `src/server/services/leagues.ts`.
- File naming: dashed kebab-case for files (`players.ts`), camelCase for functions, PascalCase for React components inside `app/`.

## Testing Guidelines
- There is no automated test suite yet; rely on endpoint verification: `bun run dev` plus `curl` calls mirroring the examples in `docs/*-tasks.md`.
- When adding logic, create lightweight integration checks that hit the Hono route you touched; document the reproduction steps in the PR.
- Validate database changes with `bun run db:generate` + `bun run db:migrate --config drizzle.config.ts` against a local Postgres instance before opening the PR.

## Commit & Pull Request Guidelines
- Follow the existing conventional style: `feat(scope): summary`, `chore:`, `fix:` (see recent commits such as `feat(api): ...`).
- Keep commits focused (one feature or fix per commit) and ensure they pass `bun run lint`.
- PRs should include: problem statement, solution outline, screenshots or sample responses for UI/API changes, manual test evidence (commands + results), and linked issue/task references.

## Security & Configuration Tips
- Never commit secrets. Use `.env.local` for `NEXT_PUBLIC_SUPABASE_*` and `DATABASE_URL`; reference them via `process.env` as shown in `src/server/middleware/auth.ts`.
- Rotate service keys in Supabase when sharing test environments, and document any temporary credentials inside the relevant doc under `docs/`.
