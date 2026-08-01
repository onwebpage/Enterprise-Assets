---
name: Accounts Receivable module
description: AR module architecture — schema, API routes, RBAC, frontend page/tabs/hooks
---

## What is built
- DB tables: `ar_customers`, `ar_invoices`, `ar_invoice_lines`, `ar_payments` in `lib/db/src/schema/accountsReceivable.ts`
- API routes mounted at `/api/ar/*` — `artifacts/api-server/src/routes/accountsReceivable.ts`
- Frontend page at `/app/ar` — `artifacts/omni-erp/src/pages/app/accounts-receivable.tsx`
- Hooks in `artifacts/omni-erp/src/hooks/useAccountsReceivable.ts`
- Components in `artifacts/omni-erp/src/components/app/ar/`
- Seed script: `lib/db/src/seed-ar.ts` (`pnpm --filter @workspace/db run seed:ar`)
- Nav entry: Finance group → "Accounts Receivable" using `Landmark` icon

## RBAC
- Module name string: `"Accounts Receivable"` (case-sensitive, must match the `requirePermission` call)
- Finance Manager and Accountant roles get canCreate/canEdit; Finance Manager also gets canDelete
- Sales Manager / Sales Rep get canView + canCreate only

## Key decisions
**Why:** Payment recording atomically updates `amountPaid` and `status` on `ar_invoices`. Deleting a payment reverses the balance. This keeps the invoice state consistent without triggers.

**How to apply:** Any new mutation that changes invoice balance must update `arInvoices.amountPaid` and re-derive `status` (paid/partial/sent) in the same transaction-like sequence.

**Invoice deletion rule:** Only `draft` invoices may be deleted. Non-draft invoices must be voided via status update.

## Status field values
- customers: active / inactive / blocked
- invoices: draft / sent / partial / paid / overdue / void
- payments: no status; deletion reverses the invoice balance
