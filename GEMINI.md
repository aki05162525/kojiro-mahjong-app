# GEMINI Project Context: Kojiro Mahjong App

## Project Overview

This is a web application for tracking Mahjong league scores and statistics.

The project is a full-stack application built with a modern TypeScript-based stack:

- **Framework**: [Next.js](https://nextjs.org/) (v15) with the App Router.
- **UI**: [React](https://react.dev/) (v19).
- **Backend API**: [Hono.js](https://hono.js.org/) running on Vercel Functions via the Next.js API routes (`/api`).
- **Database ORM**: [Drizzle ORM](https://orm.drizzle.team/) for type-safe database access.
- **Database**: [PostgreSQL](https://www.postgresql.org/), configured via `drizzle.config.ts` and a `DATABASE_URL` environment variable.
- **Linting & Formatting**: [Biome](https://biomejs.dev/) is used for code formatting and linting, supplemented by ESLint for Next.js specific rules.
- **Package Manager**: The presence of `bun.lock` indicates that [Bun](https://bun.sh/) is the preferred package manager.

The database schema is extensively defined in the `db/schema/` directory, covering concepts like leagues, users, players, sessions, and scores.

## Building and Running

All commands should be run using `bun`.

### Initial Setup

1.  **Install dependencies:**
    ```bash
    bun install
    ```

2.  **Environment Variables:**
    Create a `.env` file in the root directory and add the database connection string:
    ```env
    DATABASE_URL="postgresql://user:password@host:port/database"
    ```

3.  **Push Database Schema:**
    Apply the schema defined in `db/schema/` to your database.
    ```bash
    bun run db:push
    ```

### Development

- **Run the development server:**
  ```bash
  bun run dev
  ```
  The application will be available at `http://localhost:3000`.

- **Browse the database:**
  Drizzle Kit comes with a studio for browsing your database.
  ```bash
  bun run db:studio
  ```

### Production

- **Build the application:**
  ```bash
  bun run build
  ```

- **Start the production server:**
  ```bash
  bun run start
  ```

## Development Conventions

- **Code Style**: Use Biome for formatting and linting. Run `bun run format` to format all files and `bun run lint` to check for issues.
- **Database Schema**: All schema changes must be made in the files under the `db/schema/` directory. After making changes, run `bun run db:push` to apply them to the database.
- **API Routes**: Backend API endpoints are created using Hono.js in `app/api/[...route]/route.ts`.
- **Components**: React components are located within the `app/` directory, following the Next.js App Router conventions.
