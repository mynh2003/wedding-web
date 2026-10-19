import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const config = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
const smoke = fs.readFileSync(path.join(root, "scripts", "smoke-production.mjs"), "utf8");
const audit = fs.readFileSync(path.join(root, "scripts", "security-audit.mjs"), "utf8");
const runbook = fs.readFileSync(path.join(root, "docs", "PRODUCTION_RUNBOOK.md"), "utf8");

test("production cache boundaries and security headers are explicit", () => {
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /\/api\/admin\/:path\*/);
  assert.match(config, /source: "\/admin\/:path\*"[\s\S]*?key: "Referrer-Policy", value: "same-origin"/);
  assert.match(config, /private, no-store/);
});

test("smoke test checks health, auth boundary and headers", () => {
  assert.match(smoke, /\/api\/health/);
  assert.match(smoke, /api\/admin\/content/);
  assert.match(smoke, /status !== 401/);
  assert.match(smoke, /x-content-type-options/);
});

test("release audit and runbook cover secrets, quotas, backups and rollback", () => {
  assert.match(audit, /service_role/);
  assert.match(audit, /console\\.\(log\|error\)/);
  assert.match(runbook, /Core Web Vitals/);
  assert.match(runbook, /backup/i);
  assert.match(runbook, /rollback/i);
  assert.match(runbook, /quota/i);
});
