-- Expense Management schema setup — matches lib/db/src/schema/expense.ts
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS expense_categories (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_org_code_idx ON expense_categories(org_id, code);

CREATE TABLE IF NOT EXISTS expense_policies (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  policy_number text NOT NULL,
  name text NOT NULL,
  policy_type text NOT NULL DEFAULT 'max_amount',
  category text,
  max_amount numeric(15,2) NOT NULL DEFAULT 0,
  per_diem_rate numeric(15,2) NOT NULL DEFAULT 0,
  approval_threshold numeric(15,2) NOT NULL DEFAULT 0,
  requires_receipt boolean NOT NULL DEFAULT true,
  requires_approval boolean NOT NULL DEFAULT true,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS expense_policies_org_number_idx ON expense_policies(org_id, policy_number);

CREATE TABLE IF NOT EXISTS expense_claims (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  claim_number text NOT NULL,
  employee_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  department text,
  title text NOT NULL,
  description text,
  claim_date text NOT NULL,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  submitted_date text,
  approved_date text,
  approved_by text,
  approval_notes text,
  reimbursed_date text,
  reimbursement_method text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS expense_claims_org_number_idx ON expense_claims(org_id, claim_number);

CREATE TABLE IF NOT EXISTS expense_items (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  claim_id integer NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  category_id integer REFERENCES expense_categories(id) ON DELETE SET NULL,
  category_name text NOT NULL,
  expense_date text NOT NULL,
  description text NOT NULL,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text,
  vendor text,
  receipt_number text,
  receipt_url text,
  has_receipt boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  policy_check text,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expense_items_claim_idx ON expense_items(claim_id);