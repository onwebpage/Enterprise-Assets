---
name: GST & Tax Management module
description: Schema, API routes, and frontend for the GST & Tax module — tax rates, GST returns, TDS/TCS, and tax payments.
---

# GST & Tax Management Module

## Tables (lib/db/src/schema/gst.ts)
- `tax_rates` — configurable rate master (CGST, SGST, IGST, UTGST, Cess, VAT, etc.)
- `gst_returns` — return filings (GSTR-1/3B/9/2A/4/6) with computed totals
- `gst_return_entries` — transaction line items; adding an entry auto-recomputes return totals
- `tds_entries` — TDS/TCS with auto-calculated taxAmount = grossAmount × taxRate / 100
- `tax_payments` — government tax payments (GST, TDS, advance tax, etc.)

## API prefix: `/api/gst`
- `GET/POST/PUT/DELETE /tax-rates[/:id]`
- `GET/POST/PUT/DELETE /returns[/:id]`, `POST /returns/:id/submit`
- `GET/POST /returns/:returnId/entries`, `PUT/DELETE /entries/:id`
- `GET/POST/PUT/DELETE /tds[/:id]`
- `GET/POST/PUT/DELETE /payments[/:id]`
- `GET /summary` — KPIs for current period + YTD
- `GET /my-permissions` — RBAC check for module "GST & Tax"

## Business rules
- `totalTaxLiability = cgst + sgst + igst + cess`; `netPayable = max(0, taxLiability - itc)` — computed server-side on create/update
- Adding a return entry triggers re-aggregation of its parent return's totals
- TDS: `taxAmount = (grossAmount × taxRate) / 100`; `netAmount = grossAmount − taxAmount`
- Filed GST returns block edits and entry additions (409)
- Paid tax payments block deletion (409)
- Duplicate return type+period within org blocked (409)

## RBAC module name
"GST & Tax" (exact, case-sensitive match via `lower()` SQL comparison)

## Frontend
- Page: `artifacts/omni-erp/src/pages/app/gst.tsx` (replaces static placeholder)
- Hook: `artifacts/omni-erp/src/hooks/useGST.ts`
- Components: `artifacts/omni-erp/src/components/app/gst/` — TaxRatesTab, GSTReturnsTab (with expandable entries row), TDSEntriesTab, TaxPaymentsTab, plus 4 form modals and shared GSTDeleteDialog

**Why:** Return totals must stay in sync with entries — always recompute from aggregates, never trust the submitted totals as-is.
