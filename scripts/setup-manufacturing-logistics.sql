CREATE TABLE IF NOT EXISTS mfg_logistics_records (
  id serial PRIMARY KEY,
  org_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  record_number text NOT NULL,
  record_type text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  record_date text NOT NULL,
  due_date text,
  product_name text,
  quantity numeric(15,4) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'each',
  source text,
  destination text,
  partner text,
  vehicle text,
  planned_cost numeric(15,2) NOT NULL DEFAULT 0,
  actual_cost numeric(15,2) NOT NULL DEFAULT 0,
  notes text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mfg_logistics_records_org_number_idx ON mfg_logistics_records(org_id, record_number);
CREATE INDEX IF NOT EXISTS mfg_logistics_records_org_type_idx ON mfg_logistics_records(org_id, record_type);
CREATE INDEX IF NOT EXISTS mfg_logistics_records_date_idx ON mfg_logistics_records(record_date);