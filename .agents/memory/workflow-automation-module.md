---
name: Workflow Automation module
description: Schema, routes, hooks, and frontend page for the Workflow Automation module.
---

## Module name for RBAC
`"Workflow Automation"` (exact string in requirePermission calls)

## DB tables
4 tables applied via raw psql (drizzle-kit push times out — use psql directly):
- `wf_definitions` — workflow blueprints (trigger_type, status, run_count, success_count)
- `wf_steps` — ordered steps per workflow (action_type, action_config JSON, is_enabled)
- `wf_instances` — each execution run (status, duration_ms, triggered_by)
- `wf_instance_logs` — per-step log per instance (status, output JSON, error_message)

## Execution model
`executeWorkflow()` helper in the route file simulates step execution (probabilistic ~90% success per step, stops on first failure). Increments run_count/success_count on the definition, creates instance + logs atomically.

## Key constraints
- Cannot delete an `active` workflow — must pause first
- Cannot toggle a `draft` — must publish first (POST /definitions/:id/publish)
- Publish requires at least 1 step
- Manual trigger blocked on draft status

## Routes (all under /api/workflow)
- GET/POST /definitions — list / create
- GET/PUT/DELETE /definitions/:id — single workflow
- POST /definitions/:id/toggle — active ↔ paused
- POST /definitions/:id/publish — draft → active
- POST /definitions/:id/trigger — manual run
- GET /instances — execution history
- GET /instances/:id — instance with step logs

**Why:** Simulated execution keeps the module self-contained with no external dependencies. Real action dispatch (email, record updates) is a future follow-up.
