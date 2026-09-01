# OmniERP / BizOS

An enterprise-grade ERP platform built with React + Vite (frontend), Express (API server), PostgreSQL + Drizzle ORM (database), and JWT-based authentication.

## Project Structure

```
/
├── artifacts/
│   ├── omni-erp/        # React + Vite frontend (preview path: /)
│   └── api-server/      # Express API server (preview path: /api)
├── lib/
│   └── db/              # Drizzle ORM schema, migrations, seeds
│       └── src/schema/  # accountsPayable, accountsReceivable, chartOfAccounts,
│                          generalLedger, users, roles, branches, departments, etc.
└── packages/            # Shared packages (api-zod types, etc.)
```

## Running the Project

Two workflows are configured:
- **`Start application`** — Vite dev server for the frontend on port 5173
- **`API Server`** — Express API on port 8080 (builds then starts)

The mockup sandbox remains available for design-canvas previews when needed.

## Database Setup

Uses the configured PostgreSQL connection. This imported project prefers
`SUPABASE_DB_URL` and falls back to Replit's managed `DATABASE_URL`.

```bash
# Push schema to DB
cd lib/db && pnpm run push

# Seed with initial data
cd lib/db && pnpm run seed

# Seed finance demo data
cd lib/db && pnpm run seed:finance

# Seed AR demo data
cd lib/db && pnpm run seed:ar
```

## Default Credentials

- **Email:** `admin@omnierp.io`
- **Password:** `Admin@1234`

## Environment Secrets

- `DATABASE_URL` — managed by Replit PostgreSQL integration
- `SUPABASE_DB_URL` — PostgreSQL connection used by the imported project when configured
- `SESSION_SECRET` — used for JWT signing

## Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, shadcn/ui, React Router, React Query
- **Backend:** Express 5, Pino logger, CORS, cookie-parser
- **Auth:** JWT + bcryptjs, RBAC middleware
- **Database:** PostgreSQL, Drizzle ORM
- **Monorepo:** pnpm workspaces

## Modules

- Chart of Accounts (CoA)
- General Ledger (Journal Entries, posting, running balance)
- Accounts Receivable (invoices, payments)
- Accounts Payable (bills, payments)
- Advanced Treasury Management (cash accounts, daily positions, 30-day liquidity forecasts, payment/collection workflows, and authorized inter-account transfers)
- Organizations, Branches, Departments
- Users, Roles, Permissions (RBAC)
- Master Data Management (customers, vendors, categories, products, and warehouses)

## Master Data Management

Master Data Management is available under **Administration → Master Data Management**.
It uses the canonical AR, AP, and Inventory tables so records created there are
immediately available to connected modules. Access is controlled by the
`Master Data Management` permission with separate view, create, edit, and delete
actions. Records referenced by transactions or inventory activity are protected
from deletion and should be deactivated instead.

## User Preferences

<!-- Add user preferences here as they are stated -->
