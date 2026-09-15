# Authentication

Saas-cine uses Supabase Auth with Next.js App Router and `@supabase/ssr`.

## Components

- `app/auth/page.tsx`: email/password sign-in and sign-up UI.
- `app/auth/callback/route.ts`: exchanges Supabase's one-time authorization code for a session after email confirmation.
- `lib/supabase-browser.ts`: browser client using the public Supabase URL and anon key.
- `lib/supabase-server.ts`: server client that reads the Supabase auth cookies.
- `middleware.ts`: refreshes the auth session and protects `/dashboard` and `/projects`.
- `database/migrations/001_initial_schema.sql`: links application profiles and projects to `auth.users` and enforces ownership with RLS.

## Request flow

1. The browser submits email/password to `supabase.auth.signInWithPassword()` or `signUp()`.
2. Supabase Auth validates the credentials. The password is handled by Supabase Auth and is not stored in the Saas-cine database tables.
3. Supabase creates a session. With SSR enabled, session information is persisted through secure auth cookies managed by the Supabase SSR client.
4. Each request to a protected route passes through `middleware.ts`. It calls `supabase.auth.getUser()` so the server validates the current authenticated user.
5. If no user is present, the request is redirected to `/auth`. If a user is present, the request continues.
6. Database queries made with the public anon key are still subject to PostgreSQL Row Level Security. For example, projects require `auth.uid() = owner_id`.
7. Email confirmation returns to `/auth/callback`, where the one-time code is exchanged with `exchangeCodeForSession()` and the resulting session is persisted before redirecting to the requested page.

## Credentials and keys

- `NEXT_PUBLIC_SUPABASE_URL`: public project URL; safe to expose to browser code.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public client key; safe to expose because RLS must enforce authorization.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only administrative key. It bypasses RLS and must never be sent to the browser or placed in `NEXT_PUBLIC_*` variables.
- `OPENAI_API_KEY`: server-side AI provider credential; it is not part of browser authentication.

## Tokens and sessions

The application does not manually create or decode JWTs. Supabase Auth owns the access/refresh token lifecycle. The SSR integration keeps the session synchronized between browser and server through cookies. Server code should use `auth.getUser()` to validate the authenticated identity rather than trusting a user id supplied by the client.

## Security boundary

A public anon key is not an authorization mechanism by itself. Authorization comes from Supabase Auth plus RLS policies. The service-role client in `lib/supabase-admin.ts` is reserved for trusted server operations and uses `persistSession: false` and `autoRefreshToken: false` because it is not a user session.
