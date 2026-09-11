-- Normalize permission module keys to canonical RBAC keys
-- Run this script against your database to fix permission key mismatches

BEGIN;

-- Finance & Tax modules
UPDATE permissions SET module = 'accounts_receivable' WHERE LOWER(module) IN ('accounts receivable', 'ar', 'accounts-receivable');
UPDATE permissions SET module = 'accounts_payable' WHERE LOWER(module) IN ('accounts payable', 'ap', 'accounts-payable');
UPDATE permissions SET module = 'banking' WHERE LOWER(module) IN ('banking', 'bank reconciliation', 'bank reconciliations', 'bank-reconciliation');
UPDATE permissions SET module = 'fixed_assets' WHERE LOWER(module) IN ('fixed assets', 'assets', 'fixed-assets');
UPDATE permissions SET module = 'asset_depreciation' WHERE LOWER(module) IN ('asset depreciation', 'depreciation');
UPDATE permissions SET module = 'gst' WHERE LOWER(module) IN ('gst', 'gst & tax', 'gst and tax', 'gst tax', 'gst_tax', 'gst__tax');
UPDATE permissions SET module = 'tds' WHERE LOWER(module) IN ('tds', 'tds & tcs', 'tds and tcs', 'tds/tcs', 'tds_tcs', 'tds_and_tcs');
UPDATE permissions SET module = 'einvoicing' WHERE LOWER(module) IN ('e-invoicing', 'e invoicing', 'einvoice', 'e-invoice', 'e_invoicing');
UPDATE permissions SET module = 'eway_bill' WHERE LOWER(module) IN ('e-way bill', 'e way bill', 'eway bill', 'e-way-bill', 'e_way_bill');
UPDATE permissions SET module = 'budget_cost' WHERE LOWER(module) IN ('budget & cost accounting', 'advanced budget & forecasting', 'budget cost', 'budget-cost', 'budget_cost_accounting', 'advanced_budget_forecasting');
UPDATE permissions SET module = 'cash_treasury' WHERE LOWER(module) IN ('cash & treasury management', 'advanced treasury management', 'cash treasury', 'cash-treasury', 'cash_treasury_management');
UPDATE permissions SET module = 'finance' WHERE LOWER(module) IN ('finance', 'financial accounting');

-- Operations modules
UPDATE permissions SET module = 'purchase' WHERE LOWER(module) IN ('purchase', 'purchase & procurement', 'purchase and procurement', 'purchase-procurement');
UPDATE permissions SET module = 'inventory' WHERE LOWER(module) = 'inventory';
UPDATE permissions SET module = 'manufacturing' WHERE LOWER(module) = 'manufacturing';
UPDATE permissions SET module = 'hr' WHERE LOWER(module) IN ('hr', 'hr & payroll', 'hr and payroll');
UPDATE permissions SET module = 'projects' WHERE LOWER(module) = 'projects';
UPDATE permissions SET module = 'order_management' WHERE LOWER(module) IN ('order management', 'sales', 'order-management');

-- Platform modules
UPDATE permissions SET module = 'reports' WHERE LOWER(module) IN ('reports', 'reports & analytics', 'analytics');
UPDATE permissions SET module = 'documents' WHERE LOWER(module) = 'documents';
UPDATE permissions SET module = 'workflow' WHERE LOWER(module) IN ('workflow', 'workflow automation');
UPDATE permissions SET module = 'master_data' WHERE LOWER(module) IN ('master data', 'master data management', 'master-data');
UPDATE permissions SET module = 'customer_portal' WHERE LOWER(module) IN ('customer portal', 'customer-portal');
UPDATE permissions SET module = 'vendor_portal' WHERE LOWER(module) IN ('vendor portal', 'vendor-portal');

COMMIT;

-- Verify the changes
SELECT 
  module,
  COUNT(*)::int as permission_count,
  COUNT(DISTINCT role_id)::int as role_count
FROM permissions 
WHERE module IS NOT NULL 
GROUP BY module 
ORDER BY module;
