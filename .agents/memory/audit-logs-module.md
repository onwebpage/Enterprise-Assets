---
name: Audit Logs module
description: Architecture of the Audit Logs module — DB table, API routes, frontend page, and key constraints.
---

# Audit Logs Module

## DB
- Table: `audit_logs` — created via raw psql (drizzle-kit push hangs on this project)
- Schema file: `lib/db/src/schema/auditLogs.ts`, exported in `lib/db/src/schema/index.ts`
- Columns: orgId, userId (nullable FKs), userEmail, userName (denormalized), module, action, entityType, entityId, entityName, description, oldValues, newValues (text), ipAddress, status, createdAt
- Indexes on: org_id, user_id, module, action, created_at DESC

## Backend (`/api/audit`)
- Route file: `artifacts/api-server/src/routes/audit.ts`
- Registered in `artifacts/api-server/src/routes/index.ts`
- Endpoints:
  - `GET /stats` — total, last24h, uniqueUsers, byModule[], byAction[], byStatus[]
  - `GET /` — paginated list; filters: search, module, action, status, userId, dateFrom, dateTo, page, limit
  - `GET /:id` — single entry (scoped to org)
  - `POST /` — create entry; ipAddress auto-captured from request headers
  - `GET /export/csv` — streams CSV with Content-Disposition header; respects module/action/date filters

## Frontend
- Page: `artifacts/omni-erp/src/pages/app/audit-logs.tsx`
- Hook: `artifacts/omni-erp/src/hooks/useAuditLogs.ts`
- Nav: Added "Audit Logs" to Administration group in AppLayout (uses ClipboardList icon)
- Route: `/app/audit-logs` registered in App.tsx
- Features:
  - 4 stats cards (total, last24h, unique users, modules count)
  - Module breakdown bar — clickable chips that set module filter
  - Filter bar: search (Enter or button), module/action/status dropdowns, date range pickers
  - Sortable log table with pagination (50/page default)
  - Click any row to open a sliding detail drawer with full event info
  - Export CSV button opens /api/audit/export/csv in new tab

## Seed data
- 56 entries covering 20 modules: Authentication, Finance, AR, AP, Banking, GST, Purchase, Inventory, Manufacturing, HR, Sales, Documents, Workflow, Settings, User Management, etc.
- All seeded for org_id=1, user_id=1 (admin)

**Why:**
- userEmail/userName are denormalized so logs remain readable even if the user is later deleted
- orgId scope enforced on every query to prevent cross-org data leaks
- oldValues/newValues stored as text (JSON.stringify) — no jsonb needed, keeps schema simple
