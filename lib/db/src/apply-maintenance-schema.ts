import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";
import { databaseUrl } from "./connection";

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const sqlPath = path.resolve(__dirname, "../../../scripts/setup-maintenance.sql");
  const sql = readFileSync(sqlPath, "utf8");
  await pool.query(sql);
  console.log("✅ Maintenance Management schema applied successfully");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });