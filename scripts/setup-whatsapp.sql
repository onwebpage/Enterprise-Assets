CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'WhatsApp Demo',
  phone_number text,
  enabled boolean NOT NULL DEFAULT true,
  mode text NOT NULL DEFAULT 'demo',
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_configs_org_unique UNIQUE (org_id)
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_templates_org_name_unique UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id serial PRIMARY KEY,
  org_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id integer REFERENCES ar_customers(id) ON DELETE SET NULL,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  template_id integer REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  notification_type text NOT NULL DEFAULT 'general',
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  failure_reason text,
  sent_at timestamptz,
  created_by integer REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);