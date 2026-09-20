import fs from "node:fs";
import path from "node:path";

type Handler = { method: string; path: string };
type Result = { status: number; path: string; error?: string };

const inventory = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "../QA_INVENTORY.json"), "utf8")) as { backend: { handlers: Handler[] } };
const base = process.env.QA_BASE_URL ?? "http://localhost:5099/api";
const start = Number(process.env.QA_START ?? 0);
const end = Number(process.env.QA_END ?? Number.MAX_SAFE_INTEGER);
const outputFile = process.env.QA_OUTPUT ?? "QA_GET_SWEEP.json";
const loginResponse = await fetch(`${base}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "admin@omnierp.io", password: "Admin@1234" }),
});
if (!loginResponse.ok) throw new Error(`Login failed: ${loginResponse.status}`);
const login = await loginResponse.json() as { data: { token: string } };
const headers = { authorization: `Bearer ${login.data.token}` };
const paths = [...new Set(inventory.backend.handlers
  .filter((handler) => handler.method === "GET")
  .map((handler) => handler.path.replace(/:[^/]+/g, "1")))].sort();

async function check(path: string): Promise<Result> {
  try {
    const response = await fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(15000) });
    return { status: response.status, path };
  } catch (error) {
    return { status: 0, path, error: error instanceof Error ? error.message : String(error) };
  }
}

const selectedPaths = paths.slice(start, end);
const results: Result[] = [];
for (let index = 0; index < selectedPaths.length; index += 20) {
  results.push(...await Promise.all(selectedPaths.slice(index, index + 20).map(check)));
  console.log(`tested=${Math.min(index + 20, selectedPaths.length)}/${selectedPaths.length}`);
}
fs.writeFileSync(path.resolve(process.cwd(), `../${outputFile}`), `${JSON.stringify(results, null, 2)}\n`);
const counts = new Map<number, number>();
for (const result of results) counts.set(result.status, (counts.get(result.status) ?? 0) + 1);
for (const [status, count] of [...counts.entries()].sort((a, b) => a[0] - b[0])) console.log(`status_${status}=${count}`);
console.log(`selected_get_paths=${selectedPaths.length}`);
console.log(`total_unique_get_paths=${paths.length}`);
