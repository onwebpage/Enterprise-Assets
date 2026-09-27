CREATE TABLE IF NOT EXISTS intercompany_relationships (
  id serial PRIMARY KEY,
  from_org_id integer NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  to_org_id integer NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  from_due_from_account_id integer NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  to_due_to_account_id integer NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_org_id <> to_org_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS intercompany_relationships_direction_uidx
  ON intercompany_relationships (from_org_id, to_org_id);

CREATE TABLE IF NOT EXISTS intercompany_transactions (
  id serial PRIMARY KEY,
  relationship_id integer NOT NULL REFERENCES intercompany_relationships(id) ON DELETE RESTRICT,
  transaction_number text NOT NULL,
  from_org_id integer NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  to_org_id integer NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  transaction_date text NOT NULL CHECK (transaction_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  due_date text CHECK (due_date IS NULL OR due_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  description text NOT NULL,
  reference text,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR',
  from_settlement_account_id integer NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  to_settlement_account_id integer NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'settled', 'eliminated', 'void')),
  from_journal_entry_id integer REFERENCES journal_entries(id) ON DELETE RESTRICT,
  to_journal_entry_id integer REFERENCES journal_entries(id) ON DELETE RESTRICT,
  posted_at timestamptz,
  posted_by integer REFERENCES users(id) ON DELETE SET NULL,
  settled_at timestamptz,
  eliminated_at timestamptz,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_org_id <> to_org_id)
);

CREATE INDEX IF NOT EXISTS intercompany_transactions_scope_idx
  ON intercompany_transactions (from_org_id, to_org_id, transaction_date);
CREATE UNIQUE INDEX IF NOT EXISTS intercompany_transactions_number_uidx
  ON intercompany_transactions (transaction_number);

CREATE TABLE IF NOT EXISTS intercompany_eliminations (
  id serial PRIMARY KEY,
  transaction_id integer NOT NULL REFERENCES intercompany_transactions(id) ON DELETE RESTRICT,
  from_journal_entry_id integer NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
  to_journal_entry_id integer NOT NULL REFERENCES journal_entries(id) ON DELETE RESTRICT,
  notes text,
  eliminated_by integer REFERENCES users(id) ON DELETE SET NULL,
  eliminated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS intercompany_eliminations_transaction_uidx
  ON intercompany_eliminations (transaction_id);