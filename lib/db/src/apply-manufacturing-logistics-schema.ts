import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  await pool.query(readFileSync(path.resolve(dirname, "../../../scripts/setup-manufacturing-logistics.sql"), "utf8"));
  console.log("Manufacturing & Logistics schema applied successfully");
  await pool.end();
}
main().catch(error => { console.error(error); process.exit(1); });