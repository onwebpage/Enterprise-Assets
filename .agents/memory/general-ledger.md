---
name: General Ledger module
description: Architecture decisions and sharp edges for the GL module (journal entries + account ledger)
---

# General Ledger Module

## Schema
- Tables: `journal_entries` (header) + `journal_entry_lines` (lines) in `lib/db/src/schema/generalLedger.ts`
- Both exported from `lib/db/src/schema/index.ts`
- `journal_entries.date` is `text` (YYYY-MM-DD) — no timezone issues
- Lines FK to `chart_of_accounts.id` with `onDelete: restrict`

## Route
- Mounted at `/api/finance/ledger` in `artifacts/api-server/src/routes/generalLedger.ts`
- Registered in `routes/index.ts` as `router.use("/finance/ledger", generalLedgerRouter)`
- Uses the same `requirePermission("finance", ...)` RBAC pattern as CoA

## Business logic
- Posting validates Σdebit == Σcredit (tolerance 0.005) before marking posted
- Posting updates `chart_of_accounts.balance`: Debit-normal += (d-c), Credit-normal += (c-d)
- Only draft entries can be edited or deleted; posted entries are immutable
- Entry numbers are auto-generated as `JE-NNNN` scoped by orgId

## Running balance (account ledger)
- `openingBalance = currentBalance - netChangeInPeriod`
  - Debit-normal: netChange = Σdebit - Σcredit
  - Credit-normal: netChange = Σcredit - Σdebit
- Running balance computed in application code after fetching ordered lines

## Frontend
- Hook: `artifacts/omni-erp/src/hooks/useGeneralLedger.ts`
- Components:
  - `GeneralLedgerTab.tsx` — summary view + per-account ledger with running balance
  - `JournalEntriesTab.tsx` — list/search/filter/paginate JEs; view detail panel
  - `JournalEntryFormModal.tsx` — create/edit with dynamic lines + balance check
- Wired into `finance.tsx` replacing static ledger and journal tabs

## Sharp edges
- CoA account IDs in dev may not be sequential (gaps exist); never assume ID=2 exists
- `orgScope()` for journal_entries uses `eq(journalEntries.orgId, orgId)` — does NOT include null-org entries (unlike CoA which includes global accounts). Intentional: JEs are always org-specific.
- The `summary` endpoint joins lines → entries → accounts; date filters go on the JE join condition
