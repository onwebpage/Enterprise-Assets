---
name: AI Assistant module
description: Custom rule-based AI assistant built on OmniERP live data — no external API keys.
---

# AI Assistant Module

## Architecture
- Backend: `artifacts/api-server/src/routes/ai.ts` — mounted at `/api/ai`
- DB schema: `lib/db/src/schema/ai.ts` — `aiConversations`, `aiMessages` tables
- Frontend: `artifacts/omni-erp/src/pages/app/ai-assistant.tsx`
- Hooks: `artifacts/omni-erp/src/hooks/useAiAssistant.ts`

## Intent Engine
19 supported intents matched via keyword patterns in `detectIntent()`. Each maps to a data-fetching function that queries live Drizzle ORM tables.

## Critical Column Name Gotchas (fixed bugs)
- `inv_stock_levels` has `qty_on_hand` NOT `quantity_on_hand`
- `inv_products` has `cost_price` NOT `unit_cost`; `reorder_point`/`reorder_qty` are on `inv_products`, NOT `inv_stock_levels`
- `hr_payroll_runs` has `total_net` NOT `net_pay`; `period` (YYYY-MM) NOT `period_start`/`period_end`
- `hr_job_postings` has `job_number` NOT `job_code`; NO `experience_level` column
- Drizzle table objects do NOT have `.as("alias")` — use `eq()` joins with actual table names; use `${table.column}` in sql template literals for cross-table references

**Why:** These mismatches caused 500 errors on first deploy. Using Drizzle column references `${table.column}` in sql templates (not raw strings like `table_name.column`) prevents these issues.

## Routes
- GET `/api/ai/conversations` — list user's conversations
- POST `/api/ai/conversations` — create conversation
- DELETE `/api/ai/conversations/:id` — delete conversation
- GET `/api/ai/conversations/:id/messages` — get messages
- POST `/api/ai/chat` — main chat endpoint (auto-creates conversation if no conversationId)
- PATCH `/api/ai/messages/:id/feedback` — thumbs up/down
