#!/usr/bin/env tsx
/**
 * Seeds the super admin account and default admin data.
 * Run with: tsx scripts/seed-admin.ts
 */
import { sql } from "drizzle-orm";
import { db } from "../lib/db/src/index.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🔐 Seeding Super Admin...");

  // Hash password for admin / admin123
  const passwordHash = await bcrypt.hash("admin123", 12);

  // Upsert super admin
  await db.execute(sql`
    INSERT INTO super_admins (username, password_hash, display_name, email, is_active)
    VALUES ('admin', ${passwordHash}, 'Super Administrator', 'admin@omnierp.io', true)
    ON CONFLICT (username) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      display_name  = EXCLUDED.display_name,
      email         = EXCLUDED.email,
      is_active     = true,
      updated_at    = NOW()
  `);
  console.log("  ✓ Super admin (admin / admin123)");

  // Default system settings
  const settings = [
    { key: "max_login_attempts", value: "5", category: "security", description: "Max failed logins before lockout" },
    { key: "lockout_minutes", value: "15", category: "security", description: "Lockout duration in minutes" },
    { key: "session_hours", value: "8", category: "security", description: "Admin session duration in hours" },
    { key: "app_name", value: "OmniERP", category: "general", description: "Application name" },
    { key: "app_url", value: "https://omnierp.io", category: "general", description: "Application URL" },
    { key: "support_email", value: "support@omnierp.io", category: "general", description: "Support email address" },
    { key: "timezone", value: "UTC", category: "general", description: "System timezone" },
    { key: "date_format", value: "YYYY-MM-DD", category: "general", description: "Default date format" },
    { key: "currency", value: "USD", category: "general", description: "Default currency" },
    { key: "maintenance_mode", value: "false", category: "general", description: "Maintenance mode toggle" },
    { key: "max_file_size_mb", value: "50", category: "general", description: "Max upload file size in MB" },
    { key: "smtp_host", value: "", category: "email", description: "SMTP host" },
    { key: "smtp_port", value: "587", category: "email", description: "SMTP port" },
  ];

  for (const s of settings) {
    await db.execute(sql`
      INSERT INTO admin_system_settings (key, value, category, description)
      VALUES (${s.key}, ${s.value}, ${s.category}, ${s.description})
      ON CONFLICT (key) DO NOTHING
    `);
  }
  console.log("  ✓ System settings");

  // Default feature flags
  const features = [
    { key: "ai_assistant", name: "AI Assistant", description: "Enable AI-powered assistant across modules", category: "ai", isEnabled: true, rollout: 100 },
    { key: "advanced_analytics", name: "Advanced Analytics", description: "Enhanced analytics and reporting dashboards", category: "analytics", isEnabled: true, rollout: 100 },
    { key: "workflow_automation", name: "Workflow Automation", description: "Automated business process workflows", category: "operations", isEnabled: true, rollout: 100 },
    { key: "whitelabel", name: "White Label", description: "Custom branding for tenant organizations", category: "customization", isEnabled: true, rollout: 100 },
    { key: "multi_currency", name: "Multi-Currency", description: "Support multiple currencies in transactions", category: "finance", isEnabled: true, rollout: 100 },
    { key: "api_access", name: "API Access", description: "REST API access for integrations", category: "integrations", isEnabled: true, rollout: 100 },
    { key: "mfa_enforcement", name: "MFA Enforcement", description: "Enforce multi-factor authentication for all users", category: "security", isEnabled: false, rollout: 0 },
    { key: "beta_ui", name: "Beta UI Components", description: "New UI components in beta testing", category: "ui", isEnabled: false, rollout: 20 },
    { key: "email_notifications", name: "Email Notifications", description: "Automated email notification system", category: "notifications", isEnabled: true, rollout: 100 },
    { key: "document_management", name: "Document Management", description: "Full document storage and versioning", category: "operations", isEnabled: true, rollout: 100 },
    { key: "customer_portal", name: "Customer Portal", description: "Self-service portal for end customers", category: "portals", isEnabled: true, rollout: 100 },
    { key: "vendor_portal", name: "Vendor Portal", description: "Self-service portal for vendors/suppliers", category: "portals", isEnabled: true, rollout: 100 },
  ];

  for (const f of features) {
    await db.execute(sql`
      INSERT INTO admin_features (key, name, description, category, is_enabled, rollout_pct)
      VALUES (${f.key}, ${f.name}, ${f.description}, ${f.category}, ${f.isEnabled}, ${f.rollout})
      ON CONFLICT (key) DO NOTHING
    `);
  }
  console.log("  ✓ Feature flags");

  // Default integrations config
  const integrations = [
    { key: "stripe", name: "Stripe", description: "Payment processing and billing", category: "payments" },
    { key: "razorpay", name: "Razorpay", description: "Indian payment gateway", category: "payments" },
    { key: "sendgrid", name: "SendGrid", description: "Transactional email delivery", category: "email" },
    { key: "smtp_generic", name: "SMTP", description: "Generic SMTP email server", category: "email" },
    { key: "twilio", name: "Twilio", description: "SMS and WhatsApp notifications", category: "messaging" },
    { key: "slack", name: "Slack", description: "Team notifications via Slack", category: "messaging" },
    { key: "google_oauth", name: "Google OAuth", description: "Sign in with Google", category: "auth" },
    { key: "microsoft_oauth", name: "Microsoft OAuth", description: "Sign in with Microsoft", category: "auth" },
    { key: "aws_s3", name: "AWS S3", description: "Cloud file storage on Amazon S3", category: "storage" },
    { key: "gcp_storage", name: "GCP Storage", description: "Cloud file storage on Google Cloud", category: "storage" },
    { key: "datadog", name: "Datadog", description: "Application performance monitoring", category: "monitoring" },
    { key: "sentry", name: "Sentry", description: "Error tracking and reporting", category: "monitoring" },
  ];

  for (const i of integrations) {
    await db.execute(sql`
      INSERT INTO admin_integrations_config (key, name, description, category)
      VALUES (${i.key}, ${i.name}, ${i.description}, ${i.category})
      ON CONFLICT (key) DO NOTHING
    `);
  }
  console.log("  ✓ Integrations config");

  // Sample licenses
  const orgs = await db.execute<{ id: number; name: string }>(sql`SELECT id, name FROM organizations LIMIT 3`);
  for (const org of orgs) {
    const key = "LIC-" + Math.random().toString(36).substring(2, 10).toUpperCase()
      + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    await db.execute(sql`
      INSERT INTO admin_licenses (license_key, org_id, plan_name, max_users, max_modules, issued_to, expires_at, status)
      VALUES (${key}, ${org.id}, 'Enterprise', 100, 20, ${org.name}, NOW() + INTERVAL '1 year', 'active')
      ON CONFLICT DO NOTHING
    `);
  }
  console.log("  ✓ Sample licenses");

  // Sample support tickets
  const ticketData = [
    { num: "TKT-001", subject: "Cannot access Finance module", desc: "Getting 403 error when opening Finance", priority: "high", category: "access", status: "open" },
    { num: "TKT-002", subject: "Invoice PDF export broken", desc: "PDF download returns blank file", priority: "medium", category: "bug", status: "in_progress" },
    { num: "TKT-003", subject: "Request for additional user licenses", desc: "Need to increase user limit from 50 to 100", priority: "low", category: "billing", status: "open" },
    { num: "TKT-004", subject: "Data import from legacy system", desc: "Bulk import of historical AR data needed", priority: "medium", category: "data", status: "resolved" },
    { num: "TKT-005", subject: "MFA not sending OTP", desc: "Users reporting OTP emails not received", priority: "critical", category: "security", status: "open" },
  ];

  for (const t of ticketData) {
    await db.execute(sql`
      INSERT INTO admin_support_tickets
        (ticket_number, subject, description, priority, category, status, reporter_name, reporter_email)
      VALUES (${t.num}, ${t.subject}, ${t.desc}, ${t.priority}, ${t.category}, ${t.status},
              'System User', 'user@example.com')
      ON CONFLICT (ticket_number) DO NOTHING
    `);
  }
  console.log("  ✓ Sample support tickets");

  // Sample backup logs
  const backupNames = [
    { name: "backup_2026_08_01T00_00_00_auto", type: "full", status: "completed", size: 524288000 },
    { name: "backup_2026_08_03T00_00_00_auto", type: "full", status: "completed", size: 531234816 },
    { name: "backup_2026_08_05T06_00_00_incremental", type: "incremental", status: "completed", size: 10485760 },
    { name: "backup_2026_08_06T00_00_00_auto", type: "full", status: "completed", size: 537395200 },
  ];

  for (const b of backupNames) {
    await db.execute(sql`
      INSERT INTO admin_backup_logs (backup_name, type, status, initiated_by, size_bytes, completed_at)
      VALUES (${b.name}, ${b.type}, ${b.status}, 'system', ${b.size}, NOW() - INTERVAL '1 hour')
      ON CONFLICT DO NOTHING
    `);
  }
  console.log("  ✓ Backup logs");

  console.log("\n✅ Admin seed complete!");
  console.log("   Login: admin / admin123");

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
