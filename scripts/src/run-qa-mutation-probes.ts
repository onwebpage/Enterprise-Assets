import fs from "node:fs";
import path from "node:path";

type Handler = { method: string; path: string };
type Result = { method: string; path: string; status: number; error?: string };
const root = path.resolve(process.cwd(), "..");
const inventory = JSON.parse(fs.readFileSync(path.join(root, "QA_INVENTORY.json"), "utf8")) as { backend: { handlers: Handler[] } };
const base = process.env.QA_BASE_URL ?? "http://localhost:5099/api";
const loginResponse = await fetch(`${base}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@omnierp.io", password: "Admin@1234" }) });
if (!loginResponse.ok) throw new Error(`Login failed: ${loginResponse.status}`);
const login = await loginResponse.json() as { data: { token: string } };
const headers = { authorization: `Bearer ${login.data.token}`, "content-type": "application/json" };
const handlers = [...new Map(inventory.backend.handlers.filter((h) => h.method !== "GET").map((h) => [`${h.method} ${h.path}`, h])).values()];
function concrete(pathValue: string): string { return pathValue.replace(/:[^/]+/g, "999999"); }
async function probe(handler: Handler): Promise<Result> {
  const method = handler.method;
  const pathValue = concrete(handler.path);
  try {
    const response = await fetch(`${base}${pathValue}`, { method, headers, body: method === "DELETE" ? undefined : "{}", signal: AbortSignal.timeout(15000) });
    return { method, path: pathValue, status: response.status };
  } catch (error) { return { method, path: pathValue, status: 0, error: error instanceof Error ? error.message : String(error) }; }
}
const results: Result[] = [];
for (let index = 0; index < handlers.length; index += 20) {
  results.push(...await Promise.all(handlers.slice(index, index + 20).map(probe)));
  console.log(`tested=${Math.min(index + 20, handlers.length)}/${handlers.length}`);
}
fs.writeFileSync(path.join(root, "QA_MUTATION_PROBES.json"), `${JSON.stringify(results, null, 2)}\n`);
for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
  const subset = results.filter((result) => result.method === method);
  const counts = new Map<number, number>();
  for (const result of subset) counts.set(result.status, (counts.get(result.status) ?? 0) + 1);
  console.log(`${method}_tested=${subset.length}`);
  for (const [status, count] of [...counts.entries()].sort((a, b) => a[0] - b[0])) console.log(`${method}_status_${status}=${count}`);
}
