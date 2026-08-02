---
name: Banking & Fixed Assets modules
description: Schema, API routes, and frontend for Bank Reconciliation and Fixed Assets/Depreciation
---

## Bank Reconciliation
- DB schema: `lib/db/src/schema/banking.ts` — tables: `bank_accounts`, `bank_transactions`, `bank_reconciliations`, `bank_reconciliation_items`
- API: `/api/banking` — accounts, transactions, reconciliations, `POST /reconciliations/:id/complete`
- Frontend: `/app/banking` page, hooks in `useBanking.ts`, components in `src/components/app/banking/`
- Module permission name: `"Banking"`

## Fixed Assets
- DB schema: `lib/db/src/schema/fixedAssets.ts` — tables: `fixed_assets`, `asset_depreciation_entries`
- API: `/api/assets` — CRUD assets, `POST /depreciation/run`, `POST /depreciation/post`, `GET /depreciation/entries`, `DELETE /depreciation/entries/:id`
- Frontend: `/app/fixed-assets` page, hooks in `useFixedAssets.ts`, components in `src/components/app/assets/`
- Module permission names: `"Fixed Assets"` (asset CRUD) and `"Asset Depreciation"` (run/post entries)

## Critical: lib/db compilation
**Why:** `lib/db` uses TypeScript project references with `emitDeclarationOnly`. The compiled `.d.ts` files in `lib/db/dist/` must be regenerated after adding new schema files, or the API server typecheck will fail with "no exported member" errors.
**How to apply:** After modifying any `lib/db/src/schema/*.ts` file, run `cd lib/db && pnpm exec tsc -p tsconfig.json` before running the API server typecheck.

## req.params.id typing (Express 5)
In Express 5, `req.params.id` is typed as `string | string[]`. Always cast: `parseInt(String(req.params.id), 10)`.
**Why:** TypeScript strict mode will reject direct `parseInt(req.params.id, 10)` in Express 5 route files.
