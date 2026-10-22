import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, "backend", "supabase", "migrations", "202610170001_phase5_wishes.sql"), "utf8");
const route = fs.readFileSync(path.join(root, "backend", "app", "api", "wishes", "route.ts"), "utf8");
const adminRoute = fs.readFileSync(path.join(root, "backend", "app", "api", "admin", "wishes", "[id]", "route.ts"), "utf8");
const component = fs.readFileSync(path.join(root, "frontend", "components", "wishes-section.tsx"), "utf8");

test("phase 5 validates and rate-limits the public write path", () => {
  assert.match(route, /parseWishInput/);
  assert.match(route, /submit_public_wish/);
  assert.match(migration, /submission_count/);
  assert.match(migration, /current_count >= 5/);
});

test("only approved wishes enter the public realtime projection", () => {
  assert.match(migration, /new\.status = 'approved'/);
  assert.match(migration, /public_wishes_public_read/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
});

test("moderation routes require the single server-verified admin", () => {
  assert.match(adminRoute, /getAdmin\(\)/g);
  assert.match(adminRoute, /eq\("wedding_id", context\.admin\.wedding_id\)/g);
});
