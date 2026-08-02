---
name: E-Way Bill module
description: Schema, API, and frontend architecture for the E-Way Bill module added to OmniERP.
---

# E-Way Bill Module

## RBAC Module Name
`"E-Way Bill"` — must match exactly (case-sensitive) in `requirePermission(MODULE)` and seed permissions.

## DB Table
Single table `eway_bills` in `lib/db/src/schema/ewayBill.ts`. Exported via `lib/db/src/schema/index.ts`.

## Business Rules
- **Delete**: only allowed on `draft` status bills. Generated/cancelled bills cannot be deleted.
- **Edit**: only allowed on `draft` status. Generated bills must be cancelled and re-created.
- **Cancel**: only within 24 hours of generation (`validFrom` timestamp check). Requires a cancellation reason.
- **Generate**: transitions `draft → generated`, assigns a 12-digit EWB number, computes `validFrom`/`validUpto` based on distance (1 day per 100 km, min 1 day).
- **Extend**: only allowed on `generated` bills; updates `validUpto` and optionally the vehicle number.

## Tax Computation
Server-side: CGST/SGST/IGST/Cess amounts are computed from `taxableValue × rate / 100` on every create/update. Never trust client-submitted tax amounts.

## API Routes
`/api/eway-bill` — registered in `artifacts/api-server/src/routes/index.ts`.
Key actions: `POST /:id/generate`, `POST /:id/cancel`, `POST /:id/extend`.

## Frontend
- Hook: `artifacts/omni-erp/src/hooks/useEWayBill.ts`
- Components: `artifacts/omni-erp/src/components/app/eway-bill/`
  - `EWayBillFormModal.tsx` — create/edit (draft only)
  - `EWayBillActionDialogs.tsx` — delete/cancel/extend dialogs
  - `EWayBillsTab.tsx` — paginated list with inline generate/cancel/extend/view actions
- Page: `artifacts/omni-erp/src/pages/app/eway-bill.tsx`
- Nav: Finance group in `AppLayout.tsx` (uses `Truck` icon, path `/app/eway-bill`)
- Route: added to `App.tsx`

**Why:** Kept as single-table design (no sub-items like GST returns) since EWB is one document per movement. Validity computed server-side to prevent clock manipulation.
