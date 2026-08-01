---
name: Chart of Accounts module
description: Architecture, RBAC approach, and lessons from building the CoA CRUD module inside the Finance tab.
---

# Chart of Accounts Module

## Architecture

- **DB table**: `chart_of_accounts` in `lib/db/src/schema/chartOfAccounts.ts`  
  - Self-referencing `parentId` FK (uses `AnyPgColumn` from drizzle — required for circular refs)  
  - Fields: code, name, type, normalBalance, parentId, balance, description, status, orgId  
  - `normalBalance` is always derived from `type` (Asset/Expense→Debit, rest→Credit), not user-editable  

- **API**: `artifacts/api-server/src/routes/financeAccounts.ts` mounted at `/api/finance/accounts`  
  - CRUD: GET (list+filter+pagination), GET /parents, GET /my-permissions, POST, GET /:id, PUT /:id, DELETE /:id  
  - Org-scoped: rows belong to user's orgId OR have orgId=null (global)  

- **Permission middleware**: `artifacts/api-server/src/middlewares/requirePermission.ts`  
  - Checks `roles.isSystem` first → system roles always pass  
  - Then checks `permissions` table for the module  
  - No roleId → super-admin (always passes)  

- **Frontend hook**: `artifacts/omni-erp/src/hooks/useChartOfAccounts.ts`  
  - `useAccounts(params)`, `useAccountParents()`, `useFinancePermissions()`  
  - `useCreateAccount()`, `useUpdateAccount()`, `useDeleteAccount()` (React Query mutations)  

- **UI**: `artifacts/omni-erp/src/components/app/finance/`  
  - `ChartOfAccountsTab.tsx` — main table, filters, pagination, actions  
  - `AccountFormModal.tsx` — create/edit dialog (react-hook-form + zod)  
  - `DeleteAccountDialog.tsx` — delete confirmation  

## Critical Lessons

**Why:** self-referencing FK in Drizzle requires `AnyPgColumn` type; without it the schema won't compile.

**Why:** The `permissions.module` column stores mixed-case values ("Finance" not "finance") — always use `sql\`lower(...) = 'finance'\`` for the module lookup, or match the exact case used in the DB.

**Why:** System roles (`isSystem: true`) must bypass module permission checks, or the System Admin account gets locked out of all modules.

**How to apply:** Follow the same pattern (isSystem check first, then permission row lookup) for any new `requirePermission` middleware calls.

## Seeding
- Standard 30+ accounts seeded via API calls (not a seed script) — includes Assets, Liabilities, Equity, Income, Expense hierarchy.
- Seed script lives at `lib/db/src/seed-finance.ts` for finance_transactions and finance_monthly_summary.
- For CoA seeding in the future, prefer a proper `seed-coa.ts` that tracks inserted IDs rather than hardcoded parentId integers.
