#!/bin/bash
# Bootstrap script: push schema and seed initial data.
# Safe to re-run — all seeds are idempotent (INSERT ... ON CONFLICT DO NOTHING).
#
# By default uses 'push' (interactive, fails on destructive changes).
# Set FORCE_DB_PUSH=true only when you have reviewed the pending DDL
# and intentionally want to apply destructive changes unattended.
set -e

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🗄️  Building shared libraries..."
pnpm exec tsc --build lib/db lib/api-zod lib/api-client-react

echo "⬆️  Pushing database schema..."
if [ "${FORCE_DB_PUSH}" = "true" ]; then
  echo "    ⚠️  FORCE_DB_PUSH=true — destructive changes will be applied without confirmation."
  pnpm --filter @workspace/db run push-force
else
  pnpm --filter @workspace/db run push
fi

echo "🔐 Creating admin tables..."
psql "$DATABASE_URL" -f scripts/setup-admin-db.sql

echo "🌱 Seeding ERP data..."
pnpm --filter @workspace/db run seed

echo "🔑 Seeding Super Admin..."
cd /home/runner/workspace/lib/db && node --input-type=module << 'JSEOF'
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('admin123', 12);
// print for psql usage
process.stdout.write(hash + '\n');
JSEOF

# Capture hash and insert via psql
ADMIN_HASH=$(cd /home/runner/workspace/lib/db && node --input-type=module \
  --eval "import bcrypt from 'bcryptjs'; const h = await bcrypt.hash('admin123', 12); process.stdout.write(h);")

psql "$DATABASE_URL" << SQL
INSERT INTO super_admins (username, password_hash, display_name, email, is_active)
VALUES ('admin', '${ADMIN_HASH}', 'Super Administrator', 'admin@omnierp.io', true)
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active     = true,
  updated_at    = NOW();

INSERT INTO admin_system_settings (key, value, category, description) VALUES
  ('max_login_attempts', '5',               'security', 'Max failed logins before lockout'),
  ('lockout_minutes',    '15',              'security', 'Lockout duration in minutes'),
  ('session_hours',      '8',               'security', 'Admin session duration in hours'),
  ('app_name',           'OmniERP',         'general',  'Application name'),
  ('app_url',            'https://omnierp.io','general','Application URL'),
  ('support_email',      'support@omnierp.io','general','Support email address'),
  ('timezone',           'UTC',             'general',  'System timezone'),
  ('date_format',        'YYYY-MM-DD',      'general',  'Default date format'),
  ('currency',           'USD',             'general',  'Default currency'),
  ('maintenance_mode',   'false',           'general',  'Maintenance mode toggle'),
  ('max_file_size_mb',   '50',              'general',  'Max upload file size in MB'),
  ('smtp_host',          '',                'email',    'SMTP host'),
  ('smtp_port',          '587',             'email',    'SMTP port')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_features (key, name, description, is_enabled, rollout_pct, category) VALUES
  ('ai_assistant',        'AI Assistant',       'AI-powered assistant',                   true,  100, 'ai'),
  ('advanced_analytics',  'Advanced Analytics', 'Enhanced analytics and reporting',       true,  100, 'analytics'),
  ('workflow_automation', 'Workflow Automation','Automated business process workflows',   true,  100, 'operations'),
  ('whitelabel',          'White Label',        'Custom branding for tenants',            true,  100, 'customization'),
  ('multi_currency',      'Multi-Currency',     'Multiple currencies in transactions',    true,  100, 'finance'),
  ('api_access',          'API Access',         'REST API access for integrations',       true,  100, 'integrations'),
  ('mfa_enforcement',     'MFA Enforcement',    'Enforce MFA for all users',              false,   0, 'security'),
  ('dark_mode',           'Dark Mode',          'Dark theme across the platform',         true,  100, 'ui'),
  ('bulk_import',         'Bulk Data Import',   'CSV/Excel import for all modules',       true,   80, 'operations'),
  ('audit_trails',        'Audit Trails',       'Full action audit logging',              true,  100, 'security')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_integrations_config (key, name, description, category, is_enabled, status) VALUES
  ('stripe',          'Stripe',          'Payment processing',             'payments',       false, 'inactive'),
  ('razorpay',        'Razorpay',        'India payment gateway',          'payments',       false, 'inactive'),
  ('sendgrid',        'SendGrid',        'Transactional email',            'email',          false, 'inactive'),
  ('twilio',          'Twilio',          'SMS and voice',                  'communications', false, 'inactive'),
  ('slack',           'Slack',           'Team messaging notifications',   'communications', false, 'inactive'),
  ('google_oauth',    'Google OAuth',    'Sign in with Google',            'auth',           false, 'inactive'),
  ('aws_s3',          'AWS S3',          'Document and file storage',      'storage',        false, 'inactive'),
  ('datadog',         'Datadog',         'Application monitoring',         'monitoring',     false, 'inactive'),
  ('pagerduty',       'PagerDuty',       'Incident management',            'monitoring',     false, 'inactive'),
  ('hubspot',         'HubSpot',         'CRM integration',                'crm',            false, 'inactive')
ON CONFLICT (key) DO NOTHING;
SQL

echo ""
echo "✅ Setup complete!"
echo "   ERP Login:         admin@omnierp.io / Admin@1234"
echo "   Super Admin Login: admin / admin123  (at /admin-login)"
echo ""
echo "Start the app with:"
echo "   pnpm --filter @workspace/api-server run dev"
echo "   pnpm --filter @workspace/omni-erp run dev"
