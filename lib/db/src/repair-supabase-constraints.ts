import { pool } from "./index";

async function repairSupabaseConstraints(): Promise<void> {
  const duplicates = await pool.query<{ code: string; count: string }>(`
    SELECT code, COUNT(*)::text AS count
    FROM finance_currencies
    GROUP BY code
    HAVING COUNT(*) > 1
  `);

  if (duplicates.rows.length > 0) {
    throw new Error(
      `Cannot add finance_currencies.code uniqueness; duplicate codes exist: ${duplicates.rows.map((row) => `${row.code} (${row.count})`).join(", ")}`,
    );
  }

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'finance_currencies'::regclass
          AND conname = 'finance_currencies_code_key'
      ) THEN
        ALTER TABLE finance_currencies
          ADD CONSTRAINT finance_currencies_code_key UNIQUE (code);
      END IF;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'organization_memberships'::regclass AND conname = 'organization_memberships_user_organization_unique') THEN
        ALTER TABLE organization_memberships ADD CONSTRAINT organization_memberships_user_organization_unique UNIQUE (user_id, organization_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'saas_features'::regclass AND conname = 'saas_features_key_key') THEN
        ALTER TABLE saas_features ADD CONSTRAINT saas_features_key_key UNIQUE (key);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'saas_plans'::regclass AND conname = 'saas_plans_slug_key') THEN
        ALTER TABLE saas_plans ADD CONSTRAINT saas_plans_slug_key UNIQUE (slug);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'saas_plan_features'::regclass AND conname = 'saas_plan_features_unique') THEN
        ALTER TABLE saas_plan_features ADD CONSTRAINT saas_plan_features_unique UNIQUE (plan_id, feature_id);
      END IF;
    END
    $$;
  `);

  console.log("Supabase constraint repair complete.");
}

repairSupabaseConstraints()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());