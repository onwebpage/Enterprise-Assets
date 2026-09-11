-- Check current permission module keys in the database
-- This helps identify any module keys that don't match canonical RBAC keys

SELECT 
  module,
  COUNT(*)::int as permission_count,
  COUNT(DISTINCT role_id)::int as role_count
FROM permissions 
WHERE module IS NOT NULL 
GROUP BY module 
ORDER BY module;

-- Show which modules might need normalization
-- Common mismatches to look for:
-- "GST & Tax" → should be "gst"
-- "TDS & TCS" → should be "tds"
-- "E-Way Bill" → should be "eway_bill"
-- "E-Invoicing" → should be "einvoicing"
-- "Accounts Receivable" → should be "accounts_receivable"
-- "Accounts Payable" → should be "accounts_payable"
-- "Banking" / "Bank Reconciliation" → should be "banking"
-- "Fixed Assets" → should be "fixed_assets"
-- "Budget & Cost Accounting" → should be "budget_cost"
-- "Cash & Treasury Management" → should be "cash_treasury"
-- "HR & Payroll" → should be "hr"
-- "Purchase & Procurement" → should be "purchase"
-- "Workflow Automation" → should be "workflow"
-- "Master Data Management" → should be "master_data"
-- "Customer Portal" → should be "customer_portal"
-- "Vendor Portal" → should be "vendor_portal"
-- "Order Management" → should be "order_management"
