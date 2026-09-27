-- Budget & Cost Accounting schema setup — matches lib/db/src/schema/budgetCost.ts
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS cost_centres (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  department_id integer REFERENCES departments(id) ON DELETE SET NULL,
  manager text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cost_centres_org_code_idx ON cost_centres(org_id, code);

CREATE TABLE IF NOT EXISTS profit_centres (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  parent_id integer,
  manager text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profit_centres_org_code_idx ON profit_centres(org_id, code);

CREATE TABLE IF NOT EXISTS budgets (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  budget_number text NOT NULL,
  name text NOT NULL,
  fiscal_year integer NOT NULL,
  period_type text NOT NULL DEFAULT 'monthly',
  budget_type text NOT NULL DEFAULT 'operating',
  status text NOT NULL DEFAULT 'draft',
  cost_centre_id integer REFERENCES cost_centres(id) ON DELETE SET NULL,
  profit_centre_id integer REFERENCES profit_centres(id) ON DELETE SET NULL,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  created_by integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS budgets_org_number_idx ON budgets(org_id, budget_number);

CREATE TABLE IF NOT EXISTS budget_lines (
  id serial PRIMARY KEY,
  budget_id integer NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  account_id integer NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  cost_centre_id integer REFERENCES cost_centres(id) ON DELETE SET NULL,
  profit_centre_id integer REFERENCES profit_centres(id) ON DELETE SET NULL,
  period_index integer NOT NULL DEFAULT 0,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  description text
);
CREATE INDEX IF NOT EXISTS budget_lines_budget_idx ON budget_lines(budget_id);

CREATE TABLE IF NOT EXISTS product_costings (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES inv_products(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT 'v1',
  standard_cost numeric(15,4) NOT NULL DEFAULT 0,
  last_actual_cost numeric(15,4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_costings_org_product_idx ON product_costings(org_id, product_id, version);

CREATE TABLE IF NOT EXISTS product_costing_lines (
  id serial PRIMARY KEY,
  costing_id integer NOT NULL REFERENCES product_costings(id) ON DELETE CASCADE,
  component_name text NOT NULL,
  cost_type text NOT NULL DEFAULT 'material',
  quantity numeric(15,4) NOT NULL DEFAULT 1,
  unit_cost numeric(15,4) NOT NULL DEFAULT 0,
  amount numeric(15,4) NOT NULL DEFAULT 0,
  description text
);
CREATE INDEX IF NOT EXISTS product_costing_lines_cost_idx ON product_costing_lines(costing_id);

CREATE TABLE IF NOT EXISTS cost_variances (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  variance_number text NOT NULL,
  variance_type text NOT NULL DEFAULT 'price',
  product_id integer REFERENCES inv_products(id) ON DELETE SET NULL,
  account_id integer REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  cost_centre_id integer REFERENCES cost_centres(id) ON DELETE SET NULL,
  profit_centre_id integer REFERENCES profit_centres(id) ON DELETE SET NULL,
  period text NOT NULL,
  standard_amount numeric(15,2) NOT NULL DEFAULT 0,
  actual_amount numeric(15,2) NOT NULL DEFAULT 0,
  variance_amount numeric(15,2) NOT NULL DEFAULT 0,
  variance_pct numeric(8,2) NOT NULL DEFAULT 0,
  reason text,
  action text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cost_variances_org_number_idx ON cost_variances(org_id, variance_number);

CREATE TABLE IF NOT EXISTS forecasts (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  forecast_number text NOT NULL,
  name text NOT NULL,
  method text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'draft',
  currency text NOT NULL DEFAULT 'INR',
  notes text,
  created_by integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS forecasts_org_number_idx ON forecasts(org_id, forecast_number);

CREATE TABLE IF NOT EXISTS forecast_lines (
  id serial PRIMARY KEY,
  forecast_id integer NOT NULL REFERENCES forecasts(id) ON DELETE CASCADE,
  account_id integer NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  period text NOT NULL,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  is_actual boolean NOT NULL DEFAULT false,
  notes text
);
CREATE INDEX IF NOT EXISTS forecast_lines_forecast_idx ON forecast_lines(forecast_id);

CREATE TABLE IF NOT EXISTS allocation_rules (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  rule_number text NOT NULL,
  name text NOT NULL,
  source_cost_centre_id integer NOT NULL REFERENCES cost_centres(id) ON DELETE RESTRICT,
  target_profit_centre_id integer NOT NULL REFERENCES profit_centres(id) ON DELETE RESTRICT,
  basis text NOT NULL DEFAULT 'percentage',
  rate numeric(8,2) NOT NULL DEFAULT 100,
  fixed_amount numeric(15,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS allocation_rules_org_number_idx ON allocation_rules(org_id, rule_number);
CREATE INDEX IF NOT EXISTS allocation_rules_org_source_idx ON allocation_rules(org_id, source_cost_centre_id);

CREATE TABLE IF NOT EXISTS allocation_runs (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  run_number text NOT NULL,
  period text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  created_by integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS allocation_runs_org_number_idx ON allocation_runs(org_id, run_number);
CREATE INDEX IF NOT EXISTS allocation_runs_org_period_idx ON allocation_runs(org_id, period);

CREATE TABLE IF NOT EXISTS allocation_lines (
  id serial PRIMARY KEY,
  run_id integer NOT NULL REFERENCES allocation_runs(id) ON DELETE CASCADE,
  rule_id integer NOT NULL REFERENCES allocation_rules(id) ON DELETE RESTRICT,
  source_cost_centre_id integer NOT NULL REFERENCES cost_centres(id) ON DELETE RESTRICT,
  target_profit_centre_id integer NOT NULL REFERENCES profit_centres(id) ON DELETE RESTRICT,
  basis_amount numeric(15,2) NOT NULL DEFAULT 0,
  rate numeric(8,2) NOT NULL DEFAULT 0,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  description text
);
CREATE INDEX IF NOT EXISTS allocation_lines_run_idx ON allocation_lines(run_id);
