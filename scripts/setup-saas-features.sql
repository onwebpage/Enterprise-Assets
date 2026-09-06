CREATE TABLE IF NOT EXISTS saas_features (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saas_plan_features (
  id serial PRIMARY KEY,
  plan_id integer NOT NULL REFERENCES saas_plans(id) ON DELETE CASCADE,
  feature_id integer NOT NULL REFERENCES saas_features(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saas_plan_features_unique UNIQUE (plan_id, feature_id)
);

CREATE TABLE IF NOT EXISTS saas_tenant_features (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_id integer NOT NULL REFERENCES saas_features(id) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saas_tenant_features_unique UNIQUE (org_id, feature_id)
);