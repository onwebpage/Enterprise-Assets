-- Master Data Management safeguards.
-- The canonical records live in the existing AR, AP, and Inventory tables.
-- These indexes make the API's duplicate checks safe under concurrent writes.

CREATE UNIQUE INDEX IF NOT EXISTS ar_customers_org_name_unique
  ON ar_customers (org_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS ap_vendors_org_name_unique
  ON ap_vendors (org_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS inv_categories_org_name_unique
  ON inv_categories (org_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS inv_products_org_sku_unique
  ON inv_products (org_id, lower(sku));

CREATE UNIQUE INDEX IF NOT EXISTS inv_warehouses_org_code_unique
  ON inv_warehouses (org_id, lower(code));