# Frontend / Auth Error Handling Tasks

## Context
- Authentication flows currently hide session failures (empty states instead of 401) and lack user feedback on logout errors.
- Server components that fetch Supabase data do not guard against runtime exceptions, leading to blank pages if Supabase is unreachable.

## TODO
1. `src/server/actions/leagues.ts`
   - When `supabase.auth.getUser()` returns null/error, return a 401 response (e.g., throw `HTTPException` or redirect via `next/navigation`).
   - Add structured logging so repeated auth failures can be traced.
2. `app/(dashboard)/_components/page-header.tsx`
   - Wrap `supabase.auth.getUser()` in `try/catch`.
   - Fallback UI: show minimal header with a “ログイン” button if fetching the user fails.
   - Surface fetch errors via console logging or an in-app alert.
3. `components/common/user-menu.tsx`
   - Handle `supabase.auth.signOut()` rejection (toast/alert + keep button enabled when retrying).
   - Add loading state to disable the logout button while the request is pending.
4. `app/page.tsx`
   - Check the `error` returned by `supabase.auth.getSession()` and present a retry or error notice.
   - Handle sign-out errors similar to the dashboard menu.
5. Tests / docs
   - Record manual verification steps (logout failure, expired cookie redirect) in the relevant issue/task docs once fixes land.
