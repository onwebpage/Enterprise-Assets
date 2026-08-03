---
name: Settings module
description: Architecture of the Settings module — DB table, API routes, frontend tabs, and key constraints.
---

# Settings Module

## DB
- Table: `user_preferences` — created via raw psql (drizzle-kit push hangs on this project)
- Schema file: `lib/db/src/schema/userPreferences.ts`, exported in `lib/db/src/schema/index.ts`
- Columns: userId (unique FK), notifEmail/Push/Invoices/Payroll/Alerts/Reports, sessionTimeout, ipWhitelist, auditLog, theme, language, timezone, dateFormat

## Backend (`/api/settings`)
- Route file: `artifacts/api-server/src/routes/settings.ts`
- Registered in `artifacts/api-server/src/routes/index.ts`
- Endpoints:
  - GET/PUT `/profile` — firstName, lastName, phone (reads users table)
  - POST `/change-password` — verifies currentPassword, hashes newPassword
  - PATCH `/mfa` — toggles mfaEnabled on users table
  - GET/PUT `/org` — reads/updates organizations table scoped to req.user.orgId
  - GET/PUT `/preferences` — reads/upserts user_preferences; auto-creates row on first GET

## Frontend
- Page: `artifacts/omni-erp/src/pages/app/settings.tsx`
- Hook: `artifacts/omni-erp/src/hooks/useSettings.ts`
- 7 tabs: General (org info), Account (profile), Notifications (prefs toggles), Security (password form + MFA), Appearance (theme/language/timezone/dateFormat selectors), Integrations (static tiles with connect/disconnect), Data & Privacy (export buttons + danger zone)
- All tabs use real API calls via React Query; preferences save on-change (no explicit save button needed for toggles)

**Why:**
- Preferences stored per-user in DB so they persist across sessions and devices
- Org settings go through /api/settings/org (scoped to orgId) not /api/organizations directly, to avoid cross-org access
