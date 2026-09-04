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