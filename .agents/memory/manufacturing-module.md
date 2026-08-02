---
name: Manufacturing module
description: Schema, API routes, hooks, and frontend for the Manufacturing module.
---

# Manufacturing Module

## Tables (created via raw SQL — drizzle-kit push hangs on this project)
- `mfg_work_centers` — machines/assembly lines/labor stations
- `mfg_boms` — Bill of Materials headers
- `mfg_bom_lines` — BOM components (cascade-deleted with BOM)
- `mfg_work_orders` — production orders linked to BOM + work center

## RBAC module name
`"Manufacturing"` (exact case, used in requirePermission and my-permissions endpoint)

## Key routes
`/api/manufacturing/*` — summary, work-centers CRUD, boms CRUD, work-orders CRUD

## Immutability rules
- Work orders with status `done` or `cancelled` cannot be edited
- Work orders with status `in_progress` or `done` cannot be deleted
- Active BOMs (`status = 'active'`) cannot be deleted
- BOMs referenced by any work orders cannot be deleted
- Work centers with active WOs cannot be deleted

## Schema push method
**Why:** `drizzle-kit push` hangs indefinitely on this project (infinite "Pulling schema" spinner). Always use raw `psql "$DATABASE_URL" << 'EOF' ... EOF` to apply new tables directly.

## Frontend
- Page: `artifacts/omni-erp/src/pages/app/manufacturing.tsx` — full CRUD, 3 tabs (Work Orders / BOM / Work Centers)
- Hooks: `artifacts/omni-erp/src/hooks/useManufacturing.ts`
- Route already registered in App.tsx at `/app/manufacturing`
