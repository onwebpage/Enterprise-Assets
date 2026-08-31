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

Uses Replit's managed PostgreSQL (`DATABASE_URL` secret is set automatically).

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

## User Preferences

<!-- Add user preferences here as they are stated -->
