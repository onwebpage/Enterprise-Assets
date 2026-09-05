CREATE TABLE IF NOT EXISTS business_units (
  id serial PRIMARY KEY, org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id integer REFERENCES branches(id) ON DELETE SET NULL, parent_id integer,
  code text NOT NULL, name text NOT NULL, unit_type text NOT NULL DEFAULT 'operating',
  status text NOT NULL DEFAULT 'active', currency text NOT NULL DEFAULT 'INR',
  created_by integer REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);
CREATE TABLE IF NOT EXISTS warehouse_nodes (
  id serial PRIMARY KEY, org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id integer REFERENCES inv_warehouses(id) ON DELETE CASCADE, branch_id integer REFERENCES branches(id) ON DELETE SET NULL,
  parent_id integer, code text NOT NULL, name text NOT NULL, node_type text NOT NULL DEFAULT 'warehouse', created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);
CREATE TABLE IF NOT EXISTS intercompany_reconciliations (
  id serial PRIMARY KEY, org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  counterparty_org_id integer NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT, as_of_date text NOT NULL,
  source_amount numeric(15,2) NOT NULL DEFAULT 0, target_amount numeric(15,2) NOT NULL DEFAULT 0, difference numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open', notes text, created_by integer REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS consolidation_runs (
  id serial PRIMARY KEY, org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start text NOT NULL, period_end text NOT NULL, status text NOT NULL DEFAULT 'draft', entity_count integer NOT NULL DEFAULT 0,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb, created_by integer REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS branch_id integer REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE inv_warehouses ADD COLUMN IF NOT EXISTS branch_id integer REFERENCES branches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS journal_entries_org_branch_date_idx ON journal_entries (org_id, branch_id, date);
CREATE INDEX IF NOT EXISTS inv_warehouses_org_branch_idx ON inv_warehouses (org_id, branch_id);