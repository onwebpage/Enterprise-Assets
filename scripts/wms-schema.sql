CREATE TABLE IF NOT EXISTS wms_bins (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id integer NOT NULL REFERENCES inv_warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  zone text,
  bin_type text NOT NULL DEFAULT 'picking',
  capacity numeric(15,4) NOT NULL DEFAULT 0,
  barcode text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wms_bins_org_warehouse_code_idx ON wms_bins(org_id, warehouse_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS wms_bins_org_barcode_idx ON wms_bins(org_id, barcode) WHERE barcode IS NOT NULL;

CREATE TABLE IF NOT EXISTS wms_barcodes (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES inv_products(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  barcode_type text NOT NULL DEFAULT 'barcode',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wms_barcodes_org_value_idx ON wms_barcodes(org_id, barcode);

CREATE TABLE IF NOT EXISTS wms_lots (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES inv_products(id) ON DELETE RESTRICT,
  warehouse_id integer NOT NULL REFERENCES inv_warehouses(id) ON DELETE RESTRICT,
  bin_id integer REFERENCES wms_bins(id) ON DELETE SET NULL,
  lot_number text NOT NULL,
  manufacture_date text,
  expiry_date text,
  qty_on_hand numeric(15,4) NOT NULL DEFAULT 0,
  qty_reserved numeric(15,4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wms_lots_location_idx ON wms_lots(org_id, product_id, warehouse_id, bin_id, lot_number);

CREATE TABLE IF NOT EXISTS wms_serials (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES inv_products(id) ON DELETE RESTRICT,
  warehouse_id integer NOT NULL REFERENCES inv_warehouses(id) ON DELETE RESTRICT,
  bin_id integer REFERENCES wms_bins(id) ON DELETE SET NULL,
  lot_id integer REFERENCES wms_lots(id) ON DELETE SET NULL,
  serial_number text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  received_at timestamp NOT NULL DEFAULT now(),
  issued_at timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS wms_serials_org_value_idx ON wms_serials(org_id, serial_number);

CREATE TABLE IF NOT EXISTS wms_receipts (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  receipt_number text NOT NULL,
  grn_id integer REFERENCES goods_receipt_notes(id) ON DELETE SET NULL,
  warehouse_id integer NOT NULL REFERENCES inv_warehouses(id) ON DELETE RESTRICT,
  supplier_name text,
  receipt_date text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wms_receipts_org_number_idx ON wms_receipts(org_id, receipt_number);

CREATE TABLE IF NOT EXISTS wms_receipt_lines (
  id serial PRIMARY KEY,
  receipt_id integer NOT NULL REFERENCES wms_receipts(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES inv_products(id) ON DELETE RESTRICT,
  bin_id integer REFERENCES wms_bins(id) ON DELETE SET NULL,
  lot_number text,
  expiry_date text,
  qty numeric(15,4) NOT NULL,
  accepted_qty numeric(15,4) NOT NULL DEFAULT 0,
  rejected_qty numeric(15,4) NOT NULL DEFAULT 0,
  serial_numbers text,
  notes text
);

CREATE TABLE IF NOT EXISTS wms_cycle_counts (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  count_number text NOT NULL,
  warehouse_id integer NOT NULL REFERENCES inv_warehouses(id) ON DELETE RESTRICT,
  bin_id integer REFERENCES wms_bins(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  scheduled_date text NOT NULL,
  completed_at timestamp,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS wms_cycle_counts_org_number_idx ON wms_cycle_counts(org_id, count_number);

CREATE TABLE IF NOT EXISTS wms_cycle_count_lines (
  id serial PRIMARY KEY,
  count_id integer NOT NULL REFERENCES wms_cycle_counts(id) ON DELETE CASCADE,
  product_id integer NOT NULL REFERENCES inv_products(id) ON DELETE RESTRICT,
  bin_id integer REFERENCES wms_bins(id) ON DELETE SET NULL,
  expected_qty numeric(15,4) NOT NULL DEFAULT 0,
  counted_qty numeric(15,4),
  variance_qty numeric(15,4),
  notes text
);