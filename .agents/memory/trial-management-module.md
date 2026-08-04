---
name: Trial Management module
description: DB tables, backend routes, and frontend tab for SaaS trial lifecycle management.
---

# Trial Management Module

## Tables (psql-only, no drizzle-kit)
- `saas_trial_events` — audit log per subscription: event_type (created|extended|reminder_sent|converted|cancelled|expired), days_added, note, created_by
- `saas_trial_config` — single-row global settings: default_trial_days, max_extensions, auto_expire_action, reminder_days_before (jsonb), require_credit_card

## Backend routes (appended to `artifacts/api-server/src/routes/saas.ts`)
- `GET /saas/trials` — all trial subscriptions with daysRemaining, extensionCount, lastEvent computed
- `GET /saas/trials/stats` — activeTrials, expiringIn7Days, conversionRate, avgTrialDays, totalConverted
- `GET /saas/trials/:subId/events` — event log for one trial
- `POST /saas/trials/:subId/extend` — extends trialEndsAt, writes "extended" event
- `POST /saas/trials/:subId/convert` — sets status=active, clears trialEndsAt, computes MRR, writes "converted" event
- `POST /saas/trials/:subId/cancel` — sets status=cancelled + org status=suspended, writes "cancelled" event
- `POST /saas/trials/:subId/reminder` — writes "reminder_sent" event only (no actual email)
- `GET /saas/trial-config` / `PUT /saas/trial-config` — upsert single config row

## Frontend (`artifacts/omni-erp/src/pages/app/saas.tsx`)
- Added hooks: useTrials, useTrialStats, useTrialConfig, useTrialEvents
- Added types: TrialRow, TrialEvent, TrialStats, TrialConfig
- Added components: TrialEventLog, ExtendDialog, ConvertDialog, ReminderDialog, TrialConfigPanel, TrialManagementTab
- TrialManagementTab added as 5th tab in SaasPlatform (between Subscriptions and Onboarding)
- Uses `localStorage.getItem('auth_token')` directly for auth headers (same pattern as billing.tsx)

## Key rules
- `autoExpireAction` config exists but no background job actually runs expiry — it's config-only for now
- Extend is blocked at frontend when extensionCount >= maxExtensions (but not enforced server-side)
- Convert sets billingCycle from request body, defaults to existing subscription billingCycle
- daysRemaining is computed server-side as `ceil((trialEndsAt - now) / 86400000)`
