-- Cash & Treasury Management schema setup — matches lib/db/src/schema/cashTreasury.ts
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS treasury_accounts (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_number text,
  bank_name text,
  bank_branch text,
  currency text NOT NULL DEFAULT 'INR',
  current_balance numeric(15,2) NOT NULL DEFAULT 0,
  available_balance numeric(15,2) NOT NULL DEFAULT 0,
  account_type text NOT NULL DEFAULT 'checking',
  status text NOT NULL DEFAULT 'active',
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_accounts_org_name_idx ON treasury_accounts(org_id, name);

CREATE TABLE IF NOT EXISTS treasury_positions (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  account_id integer NOT NULL REFERENCES treasury_accounts(id) ON DELETE CASCADE,
  position_date text NOT NULL,
  opening_balance numeric(15,2) NOT NULL DEFAULT 0,
  closing_balance numeric(15,2) NOT NULL DEFAULT 0,
  net_cashflow numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_positions_account_date_idx ON treasury_positions(account_id, position_date);

CREATE TABLE IF NOT EXISTS treasury_liquidity_forecasts (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  account_id integer NOT NULL REFERENCES treasury_accounts(id) ON DELETE CASCADE,
  forecast_date text NOT NULL,
  projected_inflow numeric(15,2) NOT NULL DEFAULT 0,
  projected_outflow numeric(15,2) NOT NULL DEFAULT 0,
  net_cashflow numeric(15,2) NOT NULL DEFAULT 0,
  projected_balance numeric(15,2) NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'medium',
  scenario text NOT NULL DEFAULT 'base',
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_forecasts_account_date_scenario_idx ON treasury_liquidity_forecasts(account_id, forecast_date, scenario);

CREATE TABLE IF NOT EXISTS treasury_payment_plans (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  payment_number text NOT NULL,
  account_id integer REFERENCES treasury_accounts(id) ON DELETE SET NULL,
  payee_name text NOT NULL,
  vendor_name text,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  payment_date text NOT NULL,
  method text NOT NULL DEFAULT 'bank_transfer',
  category text NOT NULL DEFAULT 'operating',
  reference text,
  status text NOT NULL DEFAULT 'draft',
  paid_date text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_payment_plans_org_number_idx ON treasury_payment_plans(org_id, payment_number);
CREATE INDEX IF NOT EXISTS treasury_payment_plans_date_idx ON treasury_payment_plans(payment_date);

CREATE TABLE IF NOT EXISTS treasury_collection_plans (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  collection_number text NOT NULL,
  account_id integer REFERENCES treasury_accounts(id) ON DELETE SET NULL,
  payer_name text NOT NULL,
  customer_name text,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  collection_date text NOT NULL,
  method text NOT NULL DEFAULT 'bank_transfer',
  category text NOT NULL DEFAULT 'customer_payment',
  reference text,
  status text NOT NULL DEFAULT 'draft',
  received_date text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_collection_plans_org_number_idx ON treasury_collection_plans(org_id, collection_number);
CREATE INDEX IF NOT EXISTS treasury_collection_plans_date_idx ON treasury_collection_plans(collection_date);

CREATE TABLE IF NOT EXISTS treasury_transfers (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  transfer_number text NOT NULL,
  from_account_id integer NOT NULL REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  to_account_id integer NOT NULL REFERENCES treasury_accounts(id) ON DELETE RESTRICT,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  transfer_date text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  reference text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  executed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_transfers_org_number_idx ON treasury_transfers(org_id, transfer_number);
CREATE INDEX IF NOT EXISTS treasury_transfers_date_idx ON treasury_transfers(transfer_date);