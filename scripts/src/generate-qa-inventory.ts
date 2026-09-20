import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type SourceFile = { file: string; absolutePath: string; text: string };
type Inventory = {
  generatedAt: string;
  sourceCommit?: string;
  backend: {
    routeModules: number;
    handlers: Array<{
      module: string;
      file: string;
      line: number;
      method: string;
      path: string;
      authHints: string[];
    }>;
  };
  frontend: {
    pageFiles: number;
    routes: Array<{ file: string; line: number; path: string; guard: string }>;
    interactionSites: Array<{ file: string; line: number; kinds: string[] }>;
    apiCallSites: Array<{ file: string; line: number; method: string; path: string }>;
  };
  dataAndIntegrations: {
    databaseOperationFiles: string[];
    integrationFiles: string[];
    environmentReferences: Array<{ file: string; line: number; name: string }>;
  };
};

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "../..");

function walk(directory: string, ignored = new Set(["node_modules", "dist", ".git"])): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...walk(absolutePath, ignored));
    else results.push(absolutePath);
  }
  return results;
}

function sourceFiles(directory: string, extensions: Set<string>): SourceFile[] {
  return walk(directory)
    .filter((absolutePath) => extensions.has(path.extname(absolutePath)))
    .map((absolutePath) => ({
      file: path.relative(root, absolutePath).replaceAll("\\", "/"),
      absolutePath,
      text: fs.readFileSync(absolutePath, "utf8"),
    }));
}

function lineNumber(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function matches(text: string, pattern: RegExp): Array<{ match: RegExpExecArray; line: number }> {
  const found: Array<{ match: RegExpExecArray; line: number }> = [];
  for (const match of text.matchAll(pattern)) {
    if (match.index == null) continue;
    found.push({ match, line: lineNumber(text, match.index) });
  }
  return found;
}

const routeFiles = sourceFiles(path.join(root, "artifacts/api-server/src/routes"), new Set([".ts"]));
const frontendFiles = sourceFiles(path.join(root, "artifacts/omni-erp/src"), new Set([".ts", ".tsx"]));
const routeIndex = routeFiles.find((source) => source.file.endsWith("routes/index.ts"));
const mountPrefixes = new Map<string, string>();
if (routeIndex) {
  for (const { match } of matches(routeIndex.text, /router\.use\((?:"([^"]+)"\s*,\s*)?(?:requireAuth,\s*)?(?:requireFeature\("([^"]+)"\),\s*)?(\w+)\)/g)) {
    const prefix = match[1] ?? "";
    const feature = match[2];
    const routerName = match[3];
    mountPrefixes.set(routerName, `${prefix}${feature ? ` [feature:${feature}]` : ""}`);
  }
}

const handlers = routeFiles.flatMap((source) => {
  const prefix = source.file.endsWith("routes/index.ts") ? "" : mountPrefixes.get(`${path.basename(source.file, ".ts")}Router`) ?? "";
  const fileAuthHints = [...source.text.matchAll(/requireAuth|requireAdminAuth|requirePermission\([^\n]+|requireFeature\([^\n]+/g)].map((match) => match[0]);
  return matches(source.text, /router\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g).map(({ match, line }) => ({
    module: prefix.split(" ")[0] || path.basename(source.file, ".ts"),
    file: source.file,
    line,
    method: match[1].toUpperCase(),
    path: `${prefix.split(" ")[0] ?? ""}${match[2]}` || "/",
    authHints: [...new Set(fileAuthHints.filter((hint) => hint.includes("requireAuth") || hint.includes("requireAdminAuth") || hint.includes("requirePermission")))],
  }));
});

const pageFiles = frontendFiles.filter((source) => source.file.includes("/pages/") && source.file.endsWith(".tsx"));
const frontendRoutes = frontendFiles.flatMap((source) => matches(source.text, /<Route\s+path="([^"]+)"/g).map(({ match, line }) => ({
  file: source.file,
  line,
  path: match[1],
  guard: source.text.slice(Math.max(0, source.text.lastIndexOf("<Route", match.index ?? 0)), (match.index ?? 0) + 300).match(/Protected(?:Admin)?Route(?:\s+featureKey="([^"]+)")?/)?.[1] ?? "public-or-unresolved",
})));

const interactionSites = frontendFiles.flatMap((source) => matches(source.text, /onClick\s*=|onSubmit\s*=|onChange\s*=|<button\b|<form\b|<Dialog\b|useMutation\s*\(|useQuery\s*\(/g).map(({ match, line }) => ({
  file: source.file,
  line,
  kinds: [match[0].replace(/\s*=.*|\s*$/, "")],
})));

const apiCallSites = frontendFiles.flatMap((source) => matches(source.text, /api\.(get|post|put|patch|delete)\(\s*[`"]([^`"]+)/g).map(({ match, line }) => ({
  file: source.file,
  line,
  method: match[1].toUpperCase(),
  path: match[2],
})));

const backendSourceFiles = sourceFiles(path.join(root, "artifacts/api-server/src"), new Set([".ts"]));
const databaseOperationFiles = backendSourceFiles
  .filter((source) => /\b(db|pool|client)\.(select|insert|update|delete|query)\b|\.execute\(/.test(source.text))
  .map((source) => source.file)
  .sort();
const integrationFiles = backendSourceFiles
  .filter((source) => /whatsapp|razorpay|payment|email|powerbi|social|e-?invoice|eway|webhook/i.test(source.file))
  .map((source) => source.file)
  .sort();
const environmentReferences = backendSourceFiles.flatMap((source) => matches(source.text, /process\.env\.([A-Z0-9_]+)/g).map(({ match, line }) => ({
  file: source.file,
  line,
  name: match[1],
})));

const inventory: Inventory = {
  generatedAt: new Date().toISOString(),
  backend: { routeModules: routeFiles.length, handlers },
  frontend: { pageFiles: pageFiles.length, routes: frontendRoutes, interactionSites, apiCallSites },
  dataAndIntegrations: { databaseOperationFiles, integrationFiles, environmentReferences },
};

const outputPath = path.join(root, "QA_INVENTORY.json");
fs.writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)}`);
console.log(`Backend handlers: ${handlers.length}`);
console.log(`Frontend routes: ${frontendRoutes.length}`);
console.log(`Frontend interaction sites: ${interactionSites.length}`);
console.log(`Frontend API call sites: ${apiCallSites.length}`);
console.log(`Database operation files: ${databaseOperationFiles.length}`);
console.log(`Integration files: ${integrationFiles.length}`);
