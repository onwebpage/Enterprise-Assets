-- Maintenance Management schema setup — matches lib/db/src/schema/maintenance.ts
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS maintenance_assets (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  asset_number text NOT NULL,
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'machinery',
  manufacturer text,
  model text,
  serial_number text,
  location text,
  purchase_date text,
  expected_life_months integer NOT NULL DEFAULT 120,
  status text NOT NULL DEFAULT 'operational',
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_assets_org_number_idx ON maintenance_assets(org_id, asset_number);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id integer NOT NULL REFERENCES maintenance_assets(id) ON DELETE CASCADE,
  schedule_number text NOT NULL,
  schedule_type text NOT NULL DEFAULT 'preventive',
  title text NOT NULL,
  frequency_type text NOT NULL DEFAULT 'monthly',
  frequency_value integer NOT NULL DEFAULT 1,
  last_run_date text,
  next_due_date text,
  assigned_to text,
  estimated_hours numeric(8,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_schedules_org_number_idx ON maintenance_schedules(org_id, schedule_number);

CREATE TABLE IF NOT EXISTS maintenance_breakdowns (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id integer NOT NULL REFERENCES maintenance_assets(id) ON DELETE CASCADE,
  breakdown_number text NOT NULL,
  breakdown_type text NOT NULL DEFAULT 'mechanical',
  reported_date text NOT NULL,
  reported_time text,
  downtime_hours numeric(8,2) NOT NULL DEFAULT 0,
  root_cause text,
  action_taken text,
  status text NOT NULL DEFAULT 'open',
  resolved_date text,
  resolved_by text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_breakdowns_org_number_idx ON maintenance_breakdowns(org_id, breakdown_number);

CREATE TABLE IF NOT EXISTS maintenance_work_orders (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_number text NOT NULL,
  asset_id integer NOT NULL REFERENCES maintenance_assets(id) ON DELETE CASCADE,
  work_type text NOT NULL DEFAULT 'corrective',
  schedule_id integer REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
  breakdown_id integer REFERENCES maintenance_breakdowns(id) ON DELETE SET NULL,
  amc_id integer,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'draft',
  planned_start text,
  planned_end text,
  actual_start text,
  actual_end text,
  assigned_to text,
  labor_cost numeric(15,2) NOT NULL DEFAULT 0,
  parts_cost numeric(15,2) NOT NULL DEFAULT 0,
  total_cost numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_wo_org_number_idx ON maintenance_work_orders(org_id, work_order_number);

CREATE TABLE IF NOT EXISTS maintenance_amc (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  contract_number text NOT NULL,
  vendor_name text NOT NULL,
  title text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  contract_value numeric(15,2) NOT NULL DEFAULT 0,
  coverage text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_amc_org_number_idx ON maintenance_amc(org_id, contract_number);

CREATE TABLE IF NOT EXISTS maintenance_spare_parts (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  part_code text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  quantity_on_hand numeric(12,2) NOT NULL DEFAULT 0,
  reorder_point numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost numeric(15,2) NOT NULL DEFAULT 0,
  location text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS maintenance_parts_org_code_idx ON maintenance_spare_parts(org_id, part_code);

CREATE TABLE IF NOT EXISTS maintenance_work_order_parts (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id integer NOT NULL REFERENCES maintenance_work_orders(id) ON DELETE CASCADE,
  part_id integer NOT NULL REFERENCES maintenance_spare_parts(id) ON DELETE RESTRICT,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_cost numeric(15,2) NOT NULL DEFAULT 0,
  line_total numeric(15,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS maintenance_history (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id integer NOT NULL REFERENCES maintenance_assets(id) ON DELETE CASCADE,
  work_order_id integer REFERENCES maintenance_work_orders(id) ON DELETE SET NULL,
  part_id integer REFERENCES maintenance_spare_parts(id) ON DELETE SET NULL,
  history_type text NOT NULL DEFAULT 'corrective',
  title text NOT NULL,
  description text,
  date_performed text NOT NULL,
  technician text,
  cost numeric(15,2) NOT NULL DEFAULT 0,
  hours_spent numeric(8,2) NOT NULL DEFAULT 0,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_history_asset_idx ON maintenance_history(asset_id);