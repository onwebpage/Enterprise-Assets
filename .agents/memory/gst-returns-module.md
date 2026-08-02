---
name: GST Returns module
description: Architecture of the dedicated GST Returns page — separate from the GST & Tax module tab, reusing existing backend routes.
---

# GST Returns Module

## RBAC Module Name
`"GST & Tax"` — the GST Returns page re-uses the GST & Tax module permissions (not a new module). `useGSTPermissions()` in `useGST.ts` covers this page.

## Backend
No new router or table — reuses `/api/gst/returns` and `/api/gst/returns/:id/entries` from `artifacts/api-server/src/routes/gst.ts`.

**New endpoint added**: `GET /api/gst/returns-summary` — returns-specific KPIs: total/draft/pending/filed/overdue counts, tax aggregates (taxLiability, ITC, netPayable, CGST/SGST/IGST/Cess), by-type breakdown, and dueSoon list (next 7 days, not filed).

## Frontend
- Hook: `artifacts/omni-erp/src/hooks/useGSTReturns.ts` — barrel re-export of useGST + new `useGSTReturnsSummary()` hook
- Components: `artifacts/omni-erp/src/components/app/gst-returns/`
  - `OverviewTab.tsx` — KPI cards, by-type breakdown table, tax component bars, due-soon list, overdue alert
  - `ReturnsTable.tsx` — return-type tabs (All/GSTR-1/GSTR-3B/GSTR-9/etc.), status filter chips, paginated table with view/edit/file/delete row actions, detail sheet trigger
  - `ReturnDetailSheet.tsx` — slide-out panel: tax summary, status transitions (draft→pending), file return action, full entries list with add/delete
  - `EntryFormModal.tsx` — modal to add a transaction entry (B2B, B2C, export, RCM, etc.) to a return
- Page: `artifacts/omni-erp/src/pages/app/gst-returns.tsx` — two-tab layout (Overview / Returns)
- Route: `/app/gst-returns` in `App.tsx`
- Nav: Finance group in `AppLayout.tsx` — between "GST & Tax" and "E-Invoicing"

## Key design decisions
- **Reused GSTReturnFormModal and GSTDeleteDialog** from the gst/ components folder — no duplication needed.
- **Entry creation gap filled**: the original GSTReturnsTab inside GST & Tax showed entries but had no add form. `EntryFormModal` + the "Add Entry" button in `ReturnDetailSheet` fill this gap.
- **Filing workflow**: "File Return" calls `POST /api/gst/returns/:id/submit`; status transitions (draft↔pending) call `PUT /api/gst/returns/:id`. Filed returns are immutable (no edit/delete).

**Why separate page:** The GST & Tax module tab was a minimal list-only view. A dedicated page allows return-type tab navigation, a proper overview dashboard, and full entry management without coupling to the broader GST & Tax UI.
