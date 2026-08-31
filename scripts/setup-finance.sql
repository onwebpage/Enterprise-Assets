-- Finance dashboard tenancy hardening. Safe to run more than once.
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE finance_monthly_summary
  ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Existing finance seed data belongs to the first seeded organization.
UPDATE finance_transactions
SET org_id = (SELECT min(id) FROM organizations)
WHERE org_id IS NULL;

UPDATE finance_monthly_summary
SET org_id = (SELECT min(id) FROM organizations)
WHERE org_id IS NULL;

CREATE INDEX IF NOT EXISTS finance_transactions_org_id_idx
  ON finance_transactions(org_id);

CREATE INDEX IF NOT EXISTS finance_monthly_summary_org_id_idx
  ON finance_monthly_summary(org_id);