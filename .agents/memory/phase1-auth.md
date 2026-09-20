---
name: Phase 1 Auth Foundation
description: OmniERP full-stack auth setup — JWT, bcryptjs, seed data, protected routes
---

## What is done
- `lib/db/src/schema/` — organizations, branches, departments, roles, permissions, users tables (Drizzle + Postgres)
- `artifacts/api-server` — JWT (`SESSION_SECRET`), bcryptjs (10 rounds), `requireAuth` middleware, routes: /api/auth/*, /api/users, /api/roles, /api/organizations(/branches|/departments), /api/dashboard/stats
- `artifacts/omni-erp` — AuthProvider context, ProtectedRoute, App.tsx wrapped, login.tsx calls real API, AppLayout shows real user from auth context
- Seed: 3 orgs, 5 branches, 6 departments, 9 roles + permissions, 8 users

## Seed credentials
- admin@omnierp.io / Admin@1234 (System Admin, James Doyle)
- All other users: Pass@1234

## Key decisions
**Why:** JWT in localStorage (not cookies) to keep the API stateless and Render-compatible. SESSION_SECRET env var as signing key. `departments.head_name` is plain text (no circular FK to users).

**How to apply:** Any new protected route must use `requireAuth` middleware. New pages fetching data must use React Query + `api.get/post` from `@/lib/api`.

## Render env vars needed
- `NODE_ENV=production`
- `SUPABASE_DATABASE_URL` (Supabase Postgres connection string)
- `SESSION_SECRET` (random 64-char string, e.g. `openssl rand -hex 32`)

## Environment constraint
The current workspace database connection is unavailable, so database-backed login and registration cannot be verified until the managed PostgreSQL connection is restored.

**Why:** Auth routes depend on the shared Postgres schema for users and organizations; the API must not silently fall back to in-memory accounts.

**How to apply:** When auth requests return a temporary account-service error, check database connectivity and schema initialization before changing the auth flow.
