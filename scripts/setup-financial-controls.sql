CREATE TABLE IF NOT EXISTS financial_controls (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  control_number text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('reconciliation', 'approval', 'segregation_of_duties', 'period_close', 'journal_review', 'access', 'other')),
  frequency text NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual', 'event')),
  risk_level text NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  owner_id integer REFERENCES users(id) ON DELETE SET NULL,
  reviewer_id integer REFERENCES users(id) ON DELETE SET NULL,
  threshold numeric(15,2),
  due_day integer CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_controls_org_status_idx
  ON financial_controls (org_id, status);

CREATE TABLE IF NOT EXISTS financial_control_runs (
  id serial PRIMARY KEY,
  control_id integer NOT NULL REFERENCES financial_controls(id) ON DELETE RESTRICT,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  run_number text NOT NULL UNIQUE,
  period_start text NOT NULL CHECK (period_start ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  period_end text NOT NULL CHECK (period_end ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  due_date text CHECK (due_date IS NULL OR due_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'waived')),
  result text NOT NULL DEFAULT 'pending'
    CHECK (result IN ('pending', 'passed', 'failed', 'partial')),
  performed_by integer REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by integer REFERENCES users(id) ON DELETE SET NULL,
  performed_at timestamptz,
  reviewed_at timestamptz,
  notes text,
  evidence_reference text,
  exception_count integer NOT NULL DEFAULT 0 CHECK (exception_count >= 0),
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  CHECK (status <> 'completed' OR result <> 'pending')
);

CREATE INDEX IF NOT EXISTS financial_control_runs_control_period_idx
  ON financial_control_runs (control_id, period_start, period_end);

CREATE TABLE IF NOT EXISTS financial_control_exceptions (
  id serial PRIMARY KEY,
  control_run_id integer NOT NULL REFERENCES financial_control_runs(id) ON DELETE RESTRICT,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  exception_number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved', 'accepted')),
  assigned_to integer REFERENCES users(id) ON DELETE SET NULL,
  due_date text CHECK (due_date IS NULL OR due_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  resolution text,
  resolved_by integer REFERENCES users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_control_exceptions_run_status_idx
  ON financial_control_exceptions (control_run_id, status);
