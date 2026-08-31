CREATE TABLE IF NOT EXISTS financial_periods (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 1900 AND 2200),
  name text NOT NULL,
  start_date text NOT NULL CHECK (start_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  end_date text NOT NULL CHECK (end_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'soft_closed', 'closed')),
  is_year_end boolean NOT NULL DEFAULT false,
  notes text,
  closed_at timestamptz,
  closed_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS financial_periods_org_dates_idx
  ON financial_periods (org_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS year_end_closings (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  period_id integer NOT NULL REFERENCES financial_periods(id) ON DELETE RESTRICT,
  fiscal_year integer NOT NULL CHECK (fiscal_year BETWEEN 1900 AND 2200),
  closing_date text NOT NULL CHECK (closing_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  retained_earnings_account_id integer NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  journal_entry_id integer NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
  net_income numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed' CHECK (status = 'completed'),
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS year_end_closings_period_uidx
  ON year_end_closings (period_id);