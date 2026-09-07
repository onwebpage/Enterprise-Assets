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

INSERT INTO saas_features (key, name, description, category, sort_order) VALUES
  ('finance', 'Financial Accounting', 'General ledger, accounts, treasury, and financial controls.', 'finance', 10),
  ('accounts_receivable', 'Accounts Receivable', 'Customers, invoices, collections, and payments.', 'finance', 20),
  ('accounts_payable', 'Accounts Payable', 'Vendors, bills, approvals, and payments.', 'finance', 30),
  ('banking', 'Banking', 'Bank accounts, reconciliation, and transactions.', 'finance', 40),
  ('fixed_assets', 'Fixed Assets', 'Asset registers, depreciation, and disposals.', 'finance', 50),
  ('gst', 'GST & Tax', 'Tax configuration, transactions, and reporting.', 'finance', 60),
  ('einvoicing', 'E-Invoicing', 'Electronic invoice generation and tracking.', 'finance', 70),
  ('eway_bill', 'E-Way Bill', 'Shipment and transport documentation.', 'operations', 80),
  ('tds', 'TDS & TCS', 'Withholding tax workflows and returns.', 'finance', 90),
  ('purchase', 'Purchase', 'Procurement and source-to-pay workflows.', 'operations', 100),
  ('inventory', 'Inventory', 'Products, stock, warehouses, and movements.', 'operations', 110),
  ('manufacturing', 'Manufacturing', 'Bills of material, work orders, and production.', 'operations', 120),
  ('hr', 'HR & Payroll', 'Employees, leave, payroll, and statutory workflows.', 'people', 130),
  ('reports', 'Reports & Analytics', 'Operational reports and analytics dashboards.', 'intelligence', 140),
  ('ai', 'AI Assistant', 'Natural-language assistance across ERP data.', 'intelligence', 150),
  ('ai_bi', 'AI Business Intelligence', 'AI-powered business intelligence and analysis.', 'intelligence', 160),
  ('workflow', 'Workflow Automation', 'Rules, approvals, and automated business actions.', 'operations', 170),
  ('documents', 'Documents', 'Document storage, sharing, and workflows.', 'business', 180),
  ('projects', 'Projects', 'Project planning, tracking, and collaboration.', 'business', 185),
  ('customer_portal', 'Customer Portal', 'Customer-facing account and service portal.', 'portals', 190),
  ('vendor_portal', 'Vendor Portal', 'Vendor-facing collaboration and procurement portal.', 'portals', 200),
  ('notifications', 'Notifications', 'In-app notification and communication center.', 'administration', 210),
  ('billing', 'Subscription & Billing', 'Workspace billing and subscription administration.', 'administration', 220),
  ('order_management', 'Order Management', 'Sales orders, fulfillment, and order lifecycle.', 'operations', 230),
  ('wms', 'Advanced WMS', 'Warehouse management and fulfillment controls.', 'operations', 240),
  ('budget_cost', 'Budget & Forecasting', 'Budgets, forecasts, and cost controls.', 'finance', 250),
  ('quality', 'Quality Management', 'Quality inspections, findings, and controls.', 'operations', 260),
  ('maintenance', 'Maintenance', 'Maintenance plans, assets, and work orders.', 'operations', 270),
  ('expense', 'Expense Management', 'Expense capture, review, and reimbursement.', 'finance', 280),
  ('crm', 'Advanced CRM', 'Leads, opportunities, accounts, and customer activity.', 'business', 290),
  ('cash_treasury', 'Advanced Treasury', 'Cash positions, forecasts, and transfers.', 'finance', 300),
  ('master_data', 'Master Data Management', 'Shared business master data and controls.', 'administration', 310),
  ('multi_entity', 'Multi-Entity Control', 'Cross-company and entity management.', 'administration', 320),
  ('social_media', 'Social Media Integration', 'Social provider connections and local WhatsApp messaging.', 'integrations', 330)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, updated_at = now();