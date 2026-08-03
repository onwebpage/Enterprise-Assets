---
name: Vendor Portal module
description: Schema, routes, RBAC module name, and key behaviors for the Vendor Portal module.
---

# Vendor Portal Module

## RBAC module name
`"Vendor Portal"` — must match exactly in permission checks.

## Tables (created via raw psql — drizzle-kit push hangs)
- `vp_vendors` — vendor accounts (VND-XXXX codes)
- `vp_bills` — bills linked to vendors (VPB-XXXX codes)
- `vp_tickets` — vendor issue tickets (VTK-XXXX codes)
- `vp_ticket_messages` — threaded messages on tickets

## Schema file
`lib/db/src/schema/vendorPortal.ts` — exported from `lib/db/src/schema/index.ts`

## API routes
Mounted at `/api/vendor-portal` in `artifacts/api-server/src/routes/index.ts`.
Route file: `artifacts/api-server/src/routes/vendorPortal.ts`

Endpoints:
- GET/POST `/vendors`, GET/PUT/DELETE `/vendors/:id`
- POST `/vendors/:id/invite` — marks invite sent, sets status to active
- POST `/vendors/:id/toggle` — flips portalEnabled + status active/inactive
- GET/POST `/bills`, GET/PUT/DELETE `/bills/:id` — paid bills cannot be deleted
- GET/POST `/tickets`, GET/PUT `/tickets/:id`
- GET/POST `/tickets/:id/messages`
- GET `/summary` — aggregate stats
- GET `/activity` — unified feed of recent vendor/bill/ticket/message events

## Frontend
- Page: `artifacts/omni-erp/src/pages/app/vendor-portal.tsx`
- Hooks: `artifacts/omni-erp/src/hooks/useVendorPortal.ts`
- Nav path: `/app/vendor-portal` (already in AppLayout Portals group)
- Tabs: Vendors, Bills, Tickets, Performance, Activity

**Why:** Vendor Portal was built as a dedicated portal module (not reusing AP tables) following the exact pattern of Customer Portal — separate tables, own route, own React Query hooks.
