CREATE TABLE IF NOT EXISTS social_integrations (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  account_name text,
  account_id text,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'connected',
  last_tested_at timestamptz,
  last_error text,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_integrations_org_provider_unique UNIQUE (org_id, provider)
);