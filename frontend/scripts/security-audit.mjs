import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", ".next", ".git"]);
const forbidden = [/service_role/i, /SUPABASE_SERVICE_ROLE_KEY/i, /console\.(log|error)\([^\n]*(token|cookie|secret|session)/i];
const files = [];
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith(".next") || entry.name === "tests" || entry.name === "docs") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(ts|tsx|mjs|js|sql)$/.test(entry.name)) files.push(full);
  }
}
await walk(root);
const findings = [];
for (const file of files.filter((file) => !file.endsWith(path.join("scripts", "security-audit.mjs")))) {
  const source = await fs.readFile(file, "utf8");
  for (const pattern of forbidden) if (pattern.test(source)) findings.push(path.relative(root, file));
}
if (findings.length) throw new Error(`Security audit findings: ${[...new Set(findings)].join(", ")}`);
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_WEDDING_SLUG"]) {
  if (!process.env[name]) console.warn(`Warning: ${name} is not set in this shell.`);
}
console.log(`Security audit passed: ${files.length} source files checked.`);
