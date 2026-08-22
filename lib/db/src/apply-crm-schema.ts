import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sqlPath = path.resolve(__dirname, "../../../scripts/setup-crm.sql");
  const sql = readFileSync(sqlPath, "utf8");
  await pool.query(sql);
  console.log("✅ Advanced CRM schema applied successfully");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });