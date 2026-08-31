import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";
import { databaseUrl } from "./connection";

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const sqlPath = path.resolve(dirname, "../../../scripts/setup-financial-controls.sql");
  await pool.query(readFileSync(sqlPath, "utf8"));
  console.log("Financial controls schema applied successfully");
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});