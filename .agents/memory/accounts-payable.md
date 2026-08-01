---
name: Accounts Payable module
description: AP schema, RBAC module name, payment-balance atomicity rule, bill deletion policy — mirrors AR exactly with vendor/bill/payment terminology
---

## Architecture
- DB tables: `ap_vendors`, `ap_bills`, `ap_bill_lines`, `ap_payments` in `lib/db/src/schema/accountsPayable.ts`
- API route: `artifacts/api-server/src/routes/accountsPayable.ts`, mounted at `/api/ap`
- Frontend hooks: `artifacts/omni-erp/src/hooks/useAccountsPayable.ts`
- Page: `artifacts/omni-erp/src/pages/app/accounts-payable.tsx`, route `/app/ap`
- UI components: `artifacts/omni-erp/src/components/app/ap/`

## Key decisions
**RBAC module name:** `"Accounts Payable"` (exact case, checked case-insensitively in middleware)

**Why:** requirePermission uses `lower()` SQL comparison, but seed must match the module name used in permissions; keep it consistent with "Accounts Receivable".

**Payment-balance atomicity:** Creating/deleting a payment atomically updates `ap_bills.amount_paid` and recalculates status. Same pattern as AR.

**Bill deletion policy:** Only `draft` bills can be deleted. Non-draft bills must be voided first.

**Bill statuses:** draft → received → partial/paid/overdue → void (note: "received" replaces AR's "sent")

**How to apply:** Any new AP route must use `requirePermission("Accounts Payable", action)`. Payment mutations must recalculate bill status atomically.
