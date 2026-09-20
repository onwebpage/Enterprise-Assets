import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./index";

const dbDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(dbDirectory, "../../..");
const schemaDirectory = path.join(dbDirectory, "schema");
const sqlDirectory = path.join(repositoryRoot, "scripts");

function declaredTables(): string[] {
  const drizzleTables = fs.readdirSync(schemaDirectory)
    .filter((name) => name.endsWith(".ts"))
    .flatMap((name) => [...fs.readFileSync(path.join(schemaDirectory, name), "utf8").matchAll(/pgTable\("([^"]+)"/g)])
    .map((match) => match[1]);
  const supplementalTables = fs.readdirSync(sqlDirectory)
    .filter((name) => name.startsWith("setup-") && name.endsWith(".sql"))
    .flatMap((name) => [...fs.readFileSync(path.join(sqlDirectory, name), "utf8").matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/gi)])
    .map((match) => match[1]);
  return [...new Set([...drizzleTables, ...supplementalTables])].sort();
}

const expected = declaredTables();
const result = await pool.query<{ table_name: string }>(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
  [expected],
);
const actual = new Set(result.rows.map((row) => row.table_name));
const missing = expected.filter((table) => !actual.has(table));

console.log(`Expected tables: ${expected.length}`);
console.log(`Present tables: ${actual.size}`);
console.log(`Missing tables: ${missing.length}`);
if (missing.length > 0) {
  console.error(missing.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Supabase schema table coverage passed.");
}

await pool.end();