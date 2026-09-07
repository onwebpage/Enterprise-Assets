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

# Create SaaS feature-management tables
cd lib/db && pnpm run schema:saas-features

# Create social integration tables
cd lib/db && pnpm run schema:social-integrations
```

## Admin Credentials

Super-admin credentials are stored as bcrypt hashes in the configured database. They are never stored in source code or printed by setup. Use the secure credential-management form in the Super Admin panel to rotate them.

## Environment Secrets

- `DATABASE_URL` — managed by Replit PostgreSQL integration
- `SUPABASE_DB_URL` — PostgreSQL connection used by the imported project when configured
- `SESSION_SECRET` — used for JWT signing
- `POWERBI_ENCRYPTION_KEY` — server-only key used to encrypt stored Power BI client secrets
- `INTEGRATION_ENCRYPTION_KEY` — server-only key used to encrypt social media access and refresh tokens

## Social Media Integration

Social Media Integration is available under **ERP Dashboard → Integrations → Social Media Integration**.
It supports Facebook Pages, Instagram, LinkedIn, X, and YouTube provider tokens. Credentials
are organization-scoped, encrypted at rest, hidden from API responses, tested against the
provider API, and protected by the Settings RBAC permission.

WhatsApp is available under **ERP Dashboard → Integrations → Social Media Integration → WhatsApp**.
It uses a local demo transport with no external credentials: contacts are selected from AR
customers, messages and templates are persisted per organization, and delivery history records
Sent, Pending, and Failed statuses. Before enabling it in a new database, run:

```bash
cd lib/db && pnpm run schema:whatsapp
```

## SaaS Feature Management

Feature Management is available under **ERP Dashboard → SaaS → Feature Management**.
It stores a feature catalog, plan entitlements, and tenant-specific overrides in PostgreSQL.
Access resolves in this order: tenant override, plan entitlement, then disabled. The
SaaS Platform RBAC permission controls who can edit feature definitions and assignments;
tenant navigation and the `/api/saas/features/access` endpoint use the effective result.

## Power BI Integration

Power BI is available under **ERP Dashboard → Reports & Analytics → Power BI Integration**.
Configure a Microsoft Entra application with `Tenant ID`, `Client ID`, and client secret,
grant it Power BI service application permissions for the target workspace/report, and
grant admin consent. Enter the workspace and report IDs in the integration form. The API
keeps the client secret encrypted, exchanges it server-side for an Entra token, generates
a short-lived Power BI embed token, and never sends the client secret to the browser.

Before enabling the feature in a new database, run:

```bash
cd lib/db && pnpm run schema:power-bi
```

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
