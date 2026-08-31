import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";
import { databaseUrl } from "./connection";

const pool = new Pool({ connectionString: databaseUrl });

async function main() {
  const directory = path.dirname(fileURLToPath(import.meta.url));
  await pool.query(readFileSync(path.resolve(directory, "../../../scripts/setup-intercompany.sql"), "utf8"));
  console.log("Multi-company and intercompany schema applied successfully");
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});