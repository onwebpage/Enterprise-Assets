import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./index";

const sourceDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../scripts");
const files = fs.readdirSync(sourceDirectory)
  .filter((name) => name.startsWith("setup-") && name.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = fs.readFileSync(path.join(sourceDirectory, file), "utf8");
  await pool.query(sql);
  console.log(`Applied ${file}`);
}

await pool.end();
console.log(`Applied ${files.length} supplemental SQL files.`);