---
name: SaaS Multi-Tenant module
description: Two new DB tables, /api/saas routes, /app/saas frontend page — multi-tenant management inside ERP Dashboard.
---

# SaaS Multi-Tenant Module

## DB Tables (psql-created — drizzle-kit push hangs)
- `saas_plans` — plan catalog (Starter/Professional/Enterprise/Custom); slug is unique key
- `saas_subscriptions` — links org_id → plan_id; status: active/trial/suspended/cancelled; has mrr column
- `saas_whitelabel` — per-tenant branding config; org_id is UNIQUE (one config per tenant); seeded for orgs 1-10

## Drizzle Schema
`lib/db/src/schema/saas.ts` — exported from `lib/db/src/schema/index.ts`

## Backend
`artifacts/api-server/src/routes/saas.ts` — mounted at `/api/saas` in routes/index.ts

Endpoints:
- GET /api/saas/metrics — platform KPIs (totalTenants, mrr, planBreakdown)
- GET/POST/PUT/DELETE /api/saas/plans
- GET/POST/PUT /api/saas/tenants + PATCH /api/saas/tenants/:id/status
- GET /api/saas/subscriptions

**Critical quirk:** sql<> template literals must use Drizzle column refs (e.g. `${saasSubscriptions.id}`)
not raw SQL aliases (e.g. `ss.id`). Drizzle doesn't alias tables and postgres throws
`missing FROM-clause entry for table "ss"`.

## Frontend
`artifacts/omni-erp/src/pages/app/saas.tsx` — registered at `/app/saas` in App.tsx
Nav: AppLayout.tsx "SaaS" group with "SaaS Platform" item using Server icon.

5 tabs: Overview (KPI dashboard + plan distribution), Tenants (table + detail drawer + suspend/reactivate/cancel),
Plans (CRUD cards + form modal), Subscriptions (readonly table), Onboarding (3-step wizard).

**Why:** `and()` inside leftJoin for conditional joins works fine in Drizzle — just don't use raw SQL aliases.
