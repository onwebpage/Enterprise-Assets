-- Advanced payroll and statutory compliance schema.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS hr_statutory_configs (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  employee_rate numeric(7,4) NOT NULL DEFAULT 0,
  employer_rate numeric(7,4) NOT NULL DEFAULT 0,
  wage_ceiling numeric(15,2),
  threshold numeric(15,2),
  fixed_amount numeric(15,2) NOT NULL DEFAULT 0,
  jurisdiction text,
  registration_number text,
  effective_from text NOT NULL,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_payroll_statutory_lines (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  run_id integer NOT NULL REFERENCES hr_payroll_runs(id) ON DELETE CASCADE,
  employee_id integer NOT NULL REFERENCES hr_employees(id) ON DELETE RESTRICT,
  code text NOT NULL,
  base_amount numeric(15,2) NOT NULL DEFAULT 0,
  employee_amount numeric(15,2) NOT NULL DEFAULT 0,
  employer_amount numeric(15,2) NOT NULL DEFAULT 0,
  is_applicable boolean NOT NULL DEFAULT true,
  calculation_note text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hr_statutory_filings (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  period text NOT NULL,
  due_date text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  employee_count integer NOT NULL DEFAULT 0,
  employee_amount numeric(15,2) NOT NULL DEFAULT 0,
  employer_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_liability numeric(15,2) NOT NULL DEFAULT 0,
  reference_number text,
  filed_at timestamp,
  paid_at timestamp,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hr_statutory_configs_org_code_idx
  ON hr_statutory_configs(org_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS hr_payroll_statutory_lines_run_employee_code_idx
  ON hr_payroll_statutory_lines(run_id, employee_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS hr_statutory_filings_org_code_period_idx
  ON hr_statutory_filings(org_id, code, period);

CREATE INDEX IF NOT EXISTS hr_payroll_statutory_lines_org_run_idx
  ON hr_payroll_statutory_lines(org_id, run_id);

CREATE INDEX IF NOT EXISTS hr_statutory_filings_org_status_idx
  ON hr_statutory_filings(org_id, status);