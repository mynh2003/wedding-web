import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.dirname(backend);
if (!existsSync(path.join(root, "frontend/package.json")) || !existsSync(path.join(root, "backend/package.json"))) {
  throw new Error("Integration tests require a checkout containing both frontend/ and backend/. Run npm test for this service alone.");
}
const files = readdirSync(path.join(backend, "tests/integration")).filter(name => name.endsWith(".test.mjs")).map(name => path.join(backend, "tests/integration", name));
const result = spawnSync(process.execPath, ["--test", "--test-concurrency=2", ...files], { cwd: root, stdio: "inherit", windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
