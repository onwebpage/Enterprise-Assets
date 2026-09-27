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

  const username = process.env.SUPER_ADMIN_USERNAME?.trim();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!username || !password) throw new Error("Set SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD in the secure environment before seeding an admin.");
  if (username.length < 3 || username.length > 100 || !/^[a-zA-Z0-9._-]+$/.test(username)) {
    throw new Error("SUPER_ADMIN_USERNAME must be 3–100 characters and use only letters, numbers, dots, underscores, or hyphens.");
  }
  if (password.length < 12 || password.length > 200) throw new Error("SUPER_ADMIN_PASSWORD must be 12–200 characters.");
  const passwordHash = await bcrypt.hash(password, 12);

  // Upsert super admin
  await db.execute(sql`
    INSERT INTO super_admins (username, password_hash, display_name, email, is_active)
    VALUES (${username}, ${passwordHash}, 'Super Administrator', NULL, true)
    ON CONFLICT (username) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      is_active     = true,
      session_version = super_admins.session_version + 1,
      updated_at    = NOW()
  `);
  console.log("  ✓ Super admin credentials updated without printing them.");

  // Default system settings
  const settings = [
    { key: "max_login_attempts", value: "5", category: "security", description: "Max failed logins before lockout" },
    { key: "lockout_minutes", value: "15", category: "security", description: "Lockout duration in minutes" },
    { key: "session_hours", value: "8", category: "security", description: "Admin session duration in hours" },
    { key: "app_name", value: "ZorvanI ERP", category: "general", description: "Application name" },
    { key: "app_url", value: "https://zorvani.io", category: "general", description: "Application URL" },
    { key: "support_email", value: "support@zorvani.io", category: "general", description: "Support email address" },
    { key: "timezone", value: "UTC", category: "general", description: "System timezone" },
    { key: "date_format", value: "YYYY-MM-DD", category: "general", description: "Default date format" },
    { key: "currency", value: "INR", category: "general", description: "Default currency" },
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

  console.log("\n✅ Admin seed complete!");
  console.log("   Credentials are managed through the secure environment.");

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
