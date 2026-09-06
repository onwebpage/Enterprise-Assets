CREATE TABLE IF NOT EXISTS power_bi_integrations (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tenant_id text NOT NULL,
  client_id text NOT NULL,
  client_secret_encrypted text NOT NULL,
  workspace_id text NOT NULL,
  report_id text NOT NULL,
  dataset_id text,
  embed_url text,
  enabled boolean NOT NULL DEFAULT true,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT power_bi_integrations_org_unique UNIQUE (org_id)
);