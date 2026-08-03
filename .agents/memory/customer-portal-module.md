---
name: Customer Portal module
description: Schema, API routes, hooks, and frontend page for the Customer Portal module in OmniERP.
---

## RBAC module name
`"Customer Portal"` — used in `requirePermission(MODULE, ...)` calls.

## Tables
- `cp_customers` — portal accounts; codes like CPC-XXXX; status: active/inactive/pending
- `cp_invoices` — shared invoices; codes like CPI-XXXX; status: draft/sent/viewed/paid/overdue
- `cp_tickets` — support tickets; codes like TKT-XXXX; status: open/in_progress/resolved/closed; priority: low/medium/high/urgent
- `cp_ticket_messages` — threaded replies; senderType: customer/staff

## Key API paths (all under `/api/customer-portal`)
- `GET  /my-permissions` — no module guard
- `GET  /summary` — dashboard counts + outstanding amount
- `GET  /activity` — chronological event feed (customers + invoices + tickets + messages)
- `GET/POST /customers`, `GET/PUT/DELETE /customers/:id`
- `POST /customers/:id/invite` — marks inviteSentAt + sets status=active
- `POST /customers/:id/toggle` — flips portalEnabled + status active↔inactive
- `GET/POST /invoices`, `GET/PUT/DELETE /invoices/:id` — paid invoices cannot be deleted
- `GET/POST /tickets`, `GET/PUT /tickets/:id`
- `GET/POST /tickets/:id/messages` — staff reply thread
- PUT ticket to `resolved` auto-sets resolvedAt; `closed` auto-sets closedAt

## Demo seed
6 customers (Stratford Industries, Apex Global, Meridian Corp, TechParts, SupplyChain Corp, GlobalTek), 8 invoices, 6 tickets with threaded messages — all seeded via the API.

**Why:** psql-applied schema; drizzle-kit push times out.
