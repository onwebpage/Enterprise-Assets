-- Advanced Procurement Source-to-Pay schema.
-- Idempotent by design; safe to run against an existing procurement database.

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  requisition_number text NOT NULL,
  requested_by integer REFERENCES users(id) ON DELETE SET NULL,
  department text NOT NULL,
  cost_center text,
  needed_by text NOT NULL,
  justification text NOT NULL,
  estimated_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  approved_by integer REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamp,
  rejection_reason text,
  converted_po_id integer REFERENCES purchase_orders(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT purchase_requisitions_org_number_unique UNIQUE (org_id, requisition_number)
);

CREATE TABLE IF NOT EXISTS purchase_requisition_lines (
  id serial PRIMARY KEY,
  requisition_id integer NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  item_code text,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  estimated_unit_price numeric(15,2) NOT NULL DEFAULT 0,
  tax_rate numeric(8,4) NOT NULL DEFAULT 0,
  total_estimate numeric(15,2) NOT NULL DEFAULT 0,
  sequence integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_rfq_invites (
  id serial PRIMARY KEY,
  rfq_id integer NOT NULL REFERENCES purchase_rfqs(id) ON DELETE CASCADE,
  vendor_id integer NOT NULL REFERENCES purchase_vendors(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'invited',
  invited_at timestamp NOT NULL DEFAULT now(),
  responded_at timestamp,
  notes text,
  CONSTRAINT purchase_rfq_invites_unique UNIQUE (rfq_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS purchase_quotes (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  rfq_id integer NOT NULL REFERENCES purchase_rfqs(id) ON DELETE CASCADE,
  vendor_id integer NOT NULL REFERENCES purchase_vendors(id) ON DELETE RESTRICT,
  quote_number text NOT NULL,
  quote_date text NOT NULL,
  valid_until text,
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  delivery_days integer,
  payment_terms text,
  status text NOT NULL DEFAULT 'submitted',
  award_reason text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT purchase_quotes_org_number_unique UNIQUE (org_id, quote_number)
);

CREATE TABLE IF NOT EXISTS purchase_quote_lines (
  id serial PRIMARY KEY,
  quote_id integer NOT NULL REFERENCES purchase_quotes(id) ON DELETE CASCADE,
  item_code text,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  tax_rate numeric(8,4) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  sequence integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  vendor_id integer NOT NULL REFERENCES purchase_vendors(id) ON DELETE RESTRICT,
  po_id integer REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  grn_id integer REFERENCES goods_receipt_notes(id) ON DELETE RESTRICT,
  invoice_date text NOT NULL,
  due_date text,
  currency text NOT NULL DEFAULT 'INR',
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'received',
  match_status text NOT NULL DEFAULT 'pending',
  match_variance numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT purchase_invoices_org_number_unique UNIQUE (org_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS purchase_invoice_lines (
  id serial PRIMARY KEY,
  invoice_id integer NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  po_line_id integer REFERENCES purchase_order_lines(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  tax_rate numeric(8,4) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  sequence integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_payments (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  payment_number text NOT NULL,
  invoice_id integer NOT NULL REFERENCES purchase_invoices(id) ON DELETE RESTRICT,
  vendor_id integer NOT NULL REFERENCES purchase_vendors(id) ON DELETE RESTRICT,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  payment_date text NOT NULL,
  method text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'draft',
  provider_order_id text,
  provider_payment_id text,
  failure_reason text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  paid_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT purchase_payments_org_number_unique UNIQUE (org_id, payment_number)
);

CREATE INDEX IF NOT EXISTS purchase_requisitions_org_status_idx ON purchase_requisitions(org_id, status);
CREATE INDEX IF NOT EXISTS purchase_requisition_lines_req_idx ON purchase_requisition_lines(requisition_id);
CREATE INDEX IF NOT EXISTS purchase_rfq_invites_rfq_idx ON purchase_rfq_invites(rfq_id);
CREATE INDEX IF NOT EXISTS purchase_quotes_rfq_idx ON purchase_quotes(rfq_id);
CREATE INDEX IF NOT EXISTS purchase_quotes_org_status_idx ON purchase_quotes(org_id, status);
CREATE INDEX IF NOT EXISTS purchase_quote_lines_quote_idx ON purchase_quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS purchase_invoices_org_status_idx ON purchase_invoices(org_id, status, match_status);
CREATE INDEX IF NOT EXISTS purchase_invoice_lines_invoice_idx ON purchase_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS purchase_payments_org_status_idx ON purchase_payments(org_id, status);
CREATE INDEX IF NOT EXISTS purchase_payments_invoice_idx ON purchase_payments(invoice_id);