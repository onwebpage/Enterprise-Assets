import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";
import { databaseUrl } from "./connection";

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const sqlPath = path.resolve(dirname, "../../../scripts/setup-purchase-source-to-pay.sql");
  await pool.query(readFileSync(sqlPath, "utf8"));
  console.log("Advanced procurement Source-to-Pay schema applied successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());