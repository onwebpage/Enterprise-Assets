-- Quality Management schema setup — matches lib/db/src/schema/quality.ts
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS qc_parameters (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  parameter_type text NOT NULL DEFAULT 'parameter',
  unit text,
  min_value numeric(15,4),
  max_value numeric(15,4),
  allowed_values text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS qc_parameters_org_code_idx ON qc_parameters(org_id, code);

CREATE TABLE IF NOT EXISTS qc_inspections (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  inspection_number text NOT NULL,
  inspection_type text NOT NULL DEFAULT 'incoming',
  product_id integer NOT NULL REFERENCES inv_products(id) ON DELETE RESTRICT,
  warehouse_id integer REFERENCES inv_warehouses(id) ON DELETE SET NULL,
  reference_number text,
  lot_number text,
  batch_number text,
  quantity numeric(15,4) NOT NULL DEFAULT 0,
  inspected_qty numeric(15,4) NOT NULL DEFAULT 0,
  passed_qty numeric(15,4) NOT NULL DEFAULT 0,
  rejected_qty numeric(15,4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  inspector text,
  inspection_date text,
  notes text,
  created_by integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS qc_inspections_org_number_idx ON qc_inspections(org_id, inspection_number);

CREATE TABLE IF NOT EXISTS qc_inspection_lines (
  id serial PRIMARY KEY,
  inspection_id integer NOT NULL REFERENCES qc_inspections(id) ON DELETE CASCADE,
  parameter_id integer NOT NULL REFERENCES qc_parameters(id) ON DELETE RESTRICT,
  measured_value text,
  expected_value text,
  result text NOT NULL DEFAULT 'pending',
  notes text
);
CREATE INDEX IF NOT EXISTS qc_inspection_lines_inspection_idx ON qc_inspection_lines(inspection_id);

CREATE TABLE IF NOT EXISTS qc_rejections (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  rejection_number text NOT NULL,
  inspection_id integer REFERENCES qc_inspections(id) ON DELETE SET NULL,
  product_id integer NOT NULL REFERENCES inv_products(id) ON DELETE RESTRICT,
  warehouse_id integer REFERENCES inv_warehouses(id) ON DELETE SET NULL,
  lot_number text,
  batch_number text,
  quantity numeric(15,4) NOT NULL DEFAULT 0,
  reason text NOT NULL,
  disposition text NOT NULL DEFAULT 'quarantine',
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_by integer,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS qc_rejections_org_number_idx ON qc_rejections(org_id, rejection_number);

CREATE TABLE IF NOT EXISTS qc_capas (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  capa_number text NOT NULL,
  capa_type text NOT NULL DEFAULT 'corrective',
  title text NOT NULL,
  description text,
  source_type text,
  source_id integer,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  root_cause text,
  action_plan text,
  assigned_to text,
  due_date text,
  closed_date text,
  effectiveness_check text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS qc_capas_org_number_idx ON qc_capas(org_id, capa_number);

CREATE TABLE IF NOT EXISTS qc_certificates (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  certificate_number text NOT NULL,
  product_id integer NOT NULL REFERENCES inv_products(id) ON DELETE RESTRICT,
  inspection_id integer REFERENCES qc_inspections(id) ON DELETE SET NULL,
  lot_number text,
  batch_number text,
  certificate_type text NOT NULL DEFAULT 'coa',
  issue_date text NOT NULL,
  expiry_date text,
  status text NOT NULL DEFAULT 'draft',
  issued_by text,
  notes text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS qc_certificates_org_number_idx ON qc_certificates(org_id, certificate_number);

CREATE TABLE IF NOT EXISTS qc_certificate_lines (
  id serial PRIMARY KEY,
  certificate_id integer NOT NULL REFERENCES qc_certificates(id) ON DELETE CASCADE,
  parameter_id integer NOT NULL REFERENCES qc_parameters(id) ON DELETE RESTRICT,
  measured_value text,
  expected_value text,
  result text NOT NULL DEFAULT 'pass',
  notes text
);
CREATE INDEX IF NOT EXISTS qc_certificate_lines_certificate_idx ON qc_certificate_lines(certificate_id);