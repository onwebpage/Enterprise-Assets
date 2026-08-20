CREATE TABLE IF NOT EXISTS order_quotations (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  quote_number text NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  quote_date text NOT NULL,
  expiry_date text,
  currency text NOT NULL DEFAULT 'INR',
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  converted_order_id integer,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_quotation_lines (
  id serial PRIMARY KEY,
  quotation_id integer NOT NULL REFERENCES order_quotations(id) ON DELETE CASCADE,
  item_code text,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  quantity numeric(12,4) NOT NULL DEFAULT 1,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  tax_rate numeric(8,4) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  sequence integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_sales_orders (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  quotation_id integer REFERENCES order_quotations(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  order_date text NOT NULL,
  requested_delivery text,
  shipping_address text,
  currency text NOT NULL DEFAULT 'INR',
  subtotal numeric(15,2) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_sales_order_lines (
  id serial PRIMARY KEY,
  sales_order_id integer NOT NULL REFERENCES order_sales_orders(id) ON DELETE CASCADE,
  item_code text,
  description text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  ordered_qty numeric(12,4) NOT NULL DEFAULT 1,
  delivered_qty numeric(12,4) NOT NULL DEFAULT 0,
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  tax_rate numeric(8,4) NOT NULL DEFAULT 0,
  tax_amount numeric(15,2) NOT NULL DEFAULT 0,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  sequence integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_deliveries (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  sales_order_id integer NOT NULL REFERENCES order_sales_orders(id) ON DELETE RESTRICT,
  delivery_number text NOT NULL,
  dispatch_date text NOT NULL,
  estimated_date text,
  actual_date text,
  carrier text,
  tracking_number text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_delivery_lines (
  id serial PRIMARY KEY,
  delivery_id integer NOT NULL REFERENCES order_deliveries(id) ON DELETE CASCADE,
  sales_order_line_id integer NOT NULL REFERENCES order_sales_order_lines(id) ON DELETE RESTRICT,
  quantity numeric(12,4) NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_quotations_org_idx ON order_quotations(org_id);
CREATE INDEX IF NOT EXISTS order_sales_orders_org_idx ON order_sales_orders(org_id);
CREATE INDEX IF NOT EXISTS order_sales_order_lines_order_idx ON order_sales_order_lines(sales_order_id);
CREATE INDEX IF NOT EXISTS order_deliveries_org_idx ON order_deliveries(org_id);
CREATE INDEX IF NOT EXISTS order_deliveries_order_idx ON order_deliveries(sales_order_id);