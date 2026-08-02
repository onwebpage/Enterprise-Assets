---
name: HR & Payroll module
description: Schema, routes, hooks, and frontend for the HR & Payroll module.
---

## RBAC module name
`"HR & Payroll"` — must match exactly in `requirePermission()` calls.

## Tables (6)
- `hr_employees` — employee master; `emp_number` auto-generated server-side (`EMP-NNNN`)
- `hr_leave_types` — configurable leave types (CL/SL/EL etc.)
- `hr_leave_requests` — request_number auto-generated (`LR-NNNN`); approved requests are immutable (cannot delete)
- `hr_payroll_runs` — run_number auto-generated (`PAY-YYYY-MM-NNN`); paid runs are immutable
- `hr_payroll_lines` — auto-populated on payroll run creation from active employees; salary split: 50% basic, 20% HRA, 30% other; PF 12% basic, ESI 3.25% gross (if ≤21k), TDS 10% other
- `hr_job_postings` — job_number auto-generated (`JOB-NNNN`)

## Key business rules
- Active employees cannot be deleted — must terminate (set status ≠ active) first
- Approved/rejected leave requests cannot be deleted
- Paid payroll runs are fully immutable
- Creating a payroll run auto-generates lines for all active employees

## File locations
- Schema: `lib/db/src/schema/hr.ts`
- Routes: `artifacts/api-server/src/routes/hr.ts`
- Registered: `artifacts/api-server/src/routes/index.ts` as `router.use("/hr", hrRouter)`
- Hooks: `artifacts/omni-erp/src/hooks/useHR.ts`
- Page: `artifacts/omni-erp/src/pages/app/hr.tsx`

## Tabs
1. **Employees** — CRUD table; filters by status/search; Avatar with initials
2. **Payroll** — run list; click row opens detail dialog with payroll lines; workflow: draft → processing → approved → paid
3. **Leaves** — leave request list + leave type badges; approve/reject inline for pending requests
4. **Recruitment** — job posting CRUD

## Summary endpoint
`GET /api/hr/summary` — returns `{ totalEmployees, activeEmployees, onLeaveCount, openPositions, pendingLeaves, monthlyPayroll, deptBreakdown[] }`

**Why:** Pattern needed for KPI cards on the HR page without multiple round-trips.

**How to apply:** Any future summary bar additions should extend this endpoint, not add separate queries in the frontend.
