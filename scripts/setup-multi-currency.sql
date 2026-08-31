CREATE TABLE IF NOT EXISTS finance_currencies (
  id serial PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL DEFAULT '¤',
  decimal_places integer NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 6),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_system boolean NOT NULL DEFAULT false,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (code ~ '^[A-Z]{3}$')
);
CREATE UNIQUE INDEX IF NOT EXISTS finance_currencies_code_uidx ON finance_currencies(code);

INSERT INTO finance_currencies (code, name, symbol, decimal_places, status, is_system)
VALUES
  ('USD', 'US Dollar', '$', 2, 'active', true),
  ('INR', 'Indian Rupee', '₹', 2, 'active', true),
  ('EUR', 'Euro', '€', 2, 'active', true),
  ('GBP', 'British Pound', '£', 2, 'active', true),
  ('JPY', 'Japanese Yen', '¥', 0, 'active', true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS finance_exchange_rates (
  id serial PRIMARY KEY,
  from_currency text NOT NULL REFERENCES finance_currencies(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  to_currency text NOT NULL REFERENCES finance_currencies(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  rate numeric(20,8) NOT NULL CHECK (rate > 0),
  effective_date text NOT NULL CHECK (effective_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  rate_type text NOT NULL DEFAULT 'spot' CHECK (rate_type IN ('spot', 'closing', 'average')),
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_currency <> to_currency)
);
CREATE UNIQUE INDEX IF NOT EXISTS finance_exchange_rates_pair_date_uidx
  ON finance_exchange_rates(from_currency, to_currency, effective_date, rate_type);
CREATE INDEX IF NOT EXISTS finance_exchange_rates_lookup_idx
  ON finance_exchange_rates(from_currency, to_currency, effective_date);

CREATE TABLE IF NOT EXISTS currency_revaluation_runs (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  run_number text NOT NULL,
  valuation_date text NOT NULL CHECK (valuation_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  base_currency text NOT NULL REFERENCES finance_currencies(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  gain_loss_account_id integer NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
  total_gain_loss numeric(15,2) NOT NULL DEFAULT 0,
  journal_entry_id integer REFERENCES journal_entries(id) ON DELETE RESTRICT,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  posted_by integer REFERENCES users(id) ON DELETE SET NULL,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS currency_revaluation_runs_number_uidx ON currency_revaluation_runs(run_number);
CREATE INDEX IF NOT EXISTS currency_revaluation_runs_org_date_idx ON currency_revaluation_runs(org_id, valuation_date);

CREATE TABLE IF NOT EXISTS currency_revaluation_lines (
  id serial PRIMARY KEY,
  run_id integer NOT NULL REFERENCES currency_revaluation_runs(id) ON DELETE CASCADE,
  account_id integer NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  currency text NOT NULL REFERENCES finance_currencies(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  foreign_balance numeric(20,8) NOT NULL CHECK (foreign_balance <> 0),
  previous_rate numeric(20,8) NOT NULL CHECK (previous_rate > 0),
  current_rate numeric(20,8) NOT NULL CHECK (current_rate > 0),
  previous_functional_amount numeric(15,2) NOT NULL,
  current_functional_amount numeric(15,2) NOT NULL,
  gain_loss numeric(15,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS currency_revaluation_lines_run_idx ON currency_revaluation_lines(run_id);