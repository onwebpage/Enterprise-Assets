-- ══════════════════════════════════════════════════════════════
-- Super Admin DB Tables
-- ══════════════════════════════════════════════════════════════

-- 1. super_admins
CREATE TABLE IF NOT EXISTS super_admins (
  id              SERIAL PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  display_name    TEXT NOT NULL DEFAULT '',
  email           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  last_login_ip   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. admin_login_attempts
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL,
  ip_address    TEXT NOT NULL,
  success       BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent    TEXT,
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip ON admin_login_attempts(ip_address, attempted_at DESC);

-- 3. admin_audit_logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id             SERIAL PRIMARY KEY,
  admin_id       INTEGER,
  admin_username TEXT NOT NULL DEFAULT '',
  action         TEXT NOT NULL,
  resource       TEXT NOT NULL,
  resource_id    TEXT,
  details        JSONB NOT NULL DEFAULT '{}',
  ip_address     TEXT NOT NULL DEFAULT 'unknown',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

-- 4. admin_licenses
CREATE TABLE IF NOT EXISTS admin_licenses (
  id           SERIAL PRIMARY KEY,
  license_key  TEXT NOT NULL UNIQUE,
  org_id       INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  plan_name    TEXT NOT NULL DEFAULT 'Professional',
  max_users    INTEGER NOT NULL DEFAULT 50,
  max_modules  INTEGER NOT NULL DEFAULT 10,
  issued_to    TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  expires_at   TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. admin_features
CREATE TABLE IF NOT EXISTS admin_features (
  id          SERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  rollout_pct INTEGER NOT NULL DEFAULT 100,
  category    TEXT NOT NULL DEFAULT 'general',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. admin_system_settings
CREATE TABLE IF NOT EXISTS admin_system_settings (
  id          SERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. admin_support_tickets
CREATE TABLE IF NOT EXISTS admin_support_tickets (
  id             SERIAL PRIMARY KEY,
  ticket_number  TEXT NOT NULL UNIQUE,
  subject        TEXT NOT NULL,
  description    TEXT,
  org_id         INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  reporter_name  TEXT,
  reporter_email TEXT,
  priority       TEXT NOT NULL DEFAULT 'medium',
  category       TEXT NOT NULL DEFAULT 'general',
  status         TEXT NOT NULL DEFAULT 'open',
  assigned_to    TEXT,
  resolution     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. admin_backup_logs
CREATE TABLE IF NOT EXISTS admin_backup_logs (
  id           SERIAL PRIMARY KEY,
  backup_name  TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'full',
  status       TEXT NOT NULL DEFAULT 'running',
  initiated_by TEXT,
  size_bytes   BIGINT,
  notes        TEXT,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. admin_integrations_config
CREATE TABLE IF NOT EXISTS admin_integrations_config (
  id             SERIAL PRIMARY KEY,
  key            TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL DEFAULT 'general',
  is_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  status         TEXT NOT NULL DEFAULT 'inactive',
  config         JSONB NOT NULL DEFAULT '{}',
  last_tested_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
