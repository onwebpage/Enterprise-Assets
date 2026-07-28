# OmniERP / BizOS

Enterprise SaaS ERP platform — a React/Vite marketing + app UI paired with an Express API server, deployed as two separate Render services.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/omni-erp/src/` — React frontend (Vite). Pages in `pages/`, shared components in `components/`
- `artifacts/api-server/src/` — Express 5 API server. Routes in `routes/`, built to `dist/index.mjs`
- `lib/db/src/schema/index.ts` — Drizzle ORM schema (source of truth for DB shape)
- `lib/api-spec/` — OpenAPI spec; run `pnpm --filter @workspace/api-spec run codegen` to regenerate hooks
- `artifacts/omni-erp/dist/public/` — Frontend production build output (Render publish dir)

## Architecture decisions

- Frontend and API are separate Render services (static site + web service), not a single monolith
- `BASE_PATH` defaults to `/` at build time; only required explicitly in dev via Replit artifact routing
- `PORT` guard is dev-only — build mode skips the check so Render static builds work without it
- Drizzle schema is the single source of truth; `drizzle-zod` derives Zod types from it automatically
- Demo login uses hardcoded credentials client-side (no DB needed for the current frontend-only auth)

## Product

OmniERP is an enterprise ERP platform UI covering Finance, Sales, HR, Inventory, Manufacturing, Projects, GST, Banking, and more. The landing page markets the platform; `/app/*` routes are the authenticated app shell with a full sidebar and module pages.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
