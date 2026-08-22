-- Advanced CRM schema setup — matches lib/db/src/schema/crm.ts
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS crm_leads (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  lead_number text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company text,
  title text,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'website',
  status text NOT NULL DEFAULT 'new',
  assigned_to text,
  expected_value numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_org_number_idx ON crm_leads(org_id, lead_number);

CREATE TABLE IF NOT EXISTS crm_opportunities (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_number text NOT NULL,
  lead_id integer REFERENCES crm_leads(id) ON DELETE SET NULL,
  name text NOT NULL,
  company text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  stage text NOT NULL DEFAULT 'prospecting',
  amount numeric(15,2) NOT NULL DEFAULT 0,
  probability integer NOT NULL DEFAULT 10,
  expected_close_date text,
  assigned_to text,
  description text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_opps_org_number_idx ON crm_opportunities(org_id, opportunity_number);

CREATE TABLE IF NOT EXISTS crm_quotations (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  quotation_number text NOT NULL,
  opportunity_id integer REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  lead_id integer REFERENCES crm_leads(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  quotation_date text NOT NULL,
  valid_until text,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_quotes_org_number_idx ON crm_quotations(org_id, quotation_number);

CREATE TABLE IF NOT EXISTS crm_quotation_items (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  quotation_id integer NOT NULL REFERENCES crm_quotations(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  line_total numeric(15,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS crm_quote_items_quote_idx ON crm_quotation_items(quotation_id);

CREATE TABLE IF NOT EXISTS crm_activities (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id integer REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id integer REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  subject text NOT NULL,
  description text,
  activity_date text NOT NULL,
  due_date text,
  completed boolean NOT NULL DEFAULT false,
  completed_date text,
  assigned_to text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_activities_lead_idx ON crm_activities(lead_id);

CREATE TABLE IF NOT EXISTS crm_communications (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id integer REFERENCES crm_leads(id) ON DELETE CASCADE,
  opportunity_id integer REFERENCES crm_opportunities(id) ON DELETE CASCADE,
  communication_type text NOT NULL DEFAULT 'email',
  subject text NOT NULL,
  body text,
  communication_date text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  contact_name text,
  contact_email text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_comm_lead_idx ON crm_communications(lead_id);

CREATE TABLE IF NOT EXISTS crm_sales_targets (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  target_number text NOT NULL,
  salesperson text NOT NULL,
  period text NOT NULL DEFAULT 'monthly',
  period_start text NOT NULL,
  period_end text NOT NULL,
  target_amount numeric(15,2) NOT NULL DEFAULT 0,
  achieved_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_targets_org_number_idx ON crm_sales_targets(org_id, target_number);