import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [target = "all", command = "dev"] = process.argv.slice(2);
if (!["all", "frontend", "backend"].includes(target) || !["dev", "build", "start"].includes(command)) {
  throw new Error("Usage: node backend/scripts/dev-stack.mjs <all|frontend|backend> <dev|build|start>");
}
for (const role of target === "all" ? ["frontend", "backend"] : [target]) {
  if (!existsSync(path.join(root, role, "package.json"))) {
    throw new Error("Dev stack requires a checkout containing frontend/ and backend/. In a separate app repository, use npm run dev.");
  }
}

const children = new Set();
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      try { process.kill(-child.pid, "SIGTERM"); } catch { /* Already exited. */ }
    }
  }
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

function run(role) {
  const cwd = path.join(root, role);
  // Resolve the installed binary from this app, never root dependencies.
  const require = createRequire(path.join(cwd, "package.json"));
  const next = require.resolve("next/dist/bin/next");
  const port = process.env[`${role.toUpperCase()}_PORT`] ?? (role === "frontend" ? "3000" : "3001");
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error("Invalid application port");
  const args = command === "build" ? [next, "build"] : [next, command, "--hostname", "0.0.0.0", "--port", port];
  const child = spawn(process.execPath, args, {
    cwd, stdio: "inherit", windowsHide: true, detached: process.platform !== "win32",
  });
  children.add(child);
  return new Promise((resolve) => {
    child.on("error", (error) => { console.error(`[${role}] ${error.message}`); resolve(1); });
    child.on("exit", (code) => { children.delete(child); resolve(code ?? 1); });
  });
}

if (target !== "all") {
  process.exitCode = await run(target);
} else if (command === "build") {
  process.exitCode = await run("backend");
  if (!process.exitCode) process.exitCode = await run("frontend");
} else {
  process.exitCode = await Promise.race([run("backend"), run("frontend")]);
  stop();
}
