import { pool } from "@workspace/db";

/**
 * Production starts the bundled API directly, so supplemental auth changes
 * must be safe to apply before the first request when migrations were skipped.
 */
export async function ensureAuthSchema(): Promise<void> {
  await pool.query(`
    ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tenant_id integer;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' NOT NULL;
    CREATE TABLE IF NOT EXISTS tenants (
      id serial PRIMARY KEY,
      name text NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS organization_memberships (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE cascade,
      organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE cascade,
      branch_id integer REFERENCES branches(id) ON DELETE set null,
      role_id integer REFERENCES roles(id) ON DELETE set null,
      is_default boolean DEFAULT false NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      CONSTRAINT organization_memberships_user_organization_unique UNIQUE(user_id, organization_id)
    );
    CREATE TABLE IF NOT EXISTS projects (
      id serial PRIMARY KEY,
      org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      code text NOT NULL,
      name text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'planned',
      manager_id integer REFERENCES users(id) ON DELETE SET NULL,
      start_date date,
      end_date date,
      budget numeric(15,2) NOT NULL DEFAULT 0,
      is_archived boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT projects_org_code_unique UNIQUE(org_id, code)
    );
    CREATE TABLE IF NOT EXISTS saas_features (
      id serial PRIMARY KEY,
      key text NOT NULL UNIQUE,
      name text NOT NULL,
      description text,
      category text NOT NULL DEFAULT 'general',
      is_active boolean NOT NULL DEFAULT true,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS saas_plan_features (
      id serial PRIMARY KEY,
      plan_id integer NOT NULL REFERENCES saas_plans(id) ON DELETE CASCADE,
      feature_id integer NOT NULL REFERENCES saas_features(id) ON DELETE CASCADE,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT saas_plan_features_unique UNIQUE (plan_id, feature_id)
    );
    CREATE TABLE IF NOT EXISTS saas_tenant_features (
      id serial PRIMARY KEY,
      org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      feature_id integer NOT NULL REFERENCES saas_features(id) ON DELETE CASCADE,
      enabled boolean NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT saas_tenant_features_unique UNIQUE (org_id, feature_id)
    );
    INSERT INTO saas_features (key, name, category, sort_order) VALUES
      ('finance', 'Financial Accounting', 'finance', 10),
      ('accounts_receivable', 'Accounts Receivable', 'finance', 20),
      ('accounts_payable', 'Accounts Payable', 'finance', 30),
      ('banking', 'Banking', 'finance', 40),
      ('fixed_assets', 'Fixed Assets', 'finance', 50),
      ('gst', 'GST & Tax', 'finance', 60),
      ('einvoicing', 'E-Invoicing', 'finance', 70),
      ('eway_bill', 'E-Way Bill', 'operations', 80),
      ('tds', 'TDS & TCS', 'finance', 90),
      ('purchase', 'Purchase', 'operations', 100),
      ('inventory', 'Inventory', 'operations', 110),
      ('manufacturing', 'Manufacturing', 'operations', 120),
      ('hr', 'HR & Payroll', 'people', 130),
      ('reports', 'Reports & Analytics', 'intelligence', 140),
      ('ai', 'AI Assistant', 'intelligence', 150),
      ('ai_bi', 'AI Business Intelligence', 'intelligence', 160),
      ('workflow', 'Workflow Automation', 'operations', 170),
      ('documents', 'Documents', 'business', 180),
      ('projects', 'Projects', 'business', 185),
      ('customer_portal', 'Customer Portal', 'portals', 190),
      ('vendor_portal', 'Vendor Portal', 'portals', 200),
      ('notifications', 'Notifications', 'administration', 210),
      ('billing', 'Subscription & Billing', 'administration', 220),
      ('order_management', 'Order Management', 'operations', 230),
      ('wms', 'Advanced WMS', 'operations', 240),
      ('budget_cost', 'Budget & Forecasting', 'finance', 250),
      ('quality', 'Quality Management', 'operations', 260),
      ('maintenance', 'Maintenance', 'operations', 270),
      ('expense', 'Expense Management', 'finance', 280),
      ('crm', 'Advanced CRM', 'business', 290),
      ('cash_treasury', 'Advanced Treasury', 'finance', 300),
      ('master_data', 'Master Data Management', 'administration', 310),
      ('multi_entity', 'Multi-Entity Control', 'administration', 320),
      ('social_media', 'Social Media Integration', 'integrations', 330)
    ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, updated_at = now();
    INSERT INTO tenants (name)
    SELECT 'Legacy tenant ' || o.id || ': ' || o.name
    FROM organizations o
    WHERE o.tenant_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.name = 'Legacy tenant ' || o.id || ': ' || o.name);
    UPDATE organizations o
    SET tenant_id = t.id
    FROM tenants t
    WHERE o.tenant_id IS NULL
      AND t.name = 'Legacy tenant ' || o.id || ': ' || o.name;
    INSERT INTO organization_memberships (user_id, organization_id, branch_id, role_id, is_default)
    SELECT id, org_id, branch_id, role_id, true
    FROM users
    WHERE org_id IS NOT NULL
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  `);
}