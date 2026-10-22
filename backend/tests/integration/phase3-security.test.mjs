import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, "backend", "supabase", "migrations", "202610160001_phase3_foundation.sql"), "utf8");

test("Phase 3 migration enables RLS on every application table", () => {
  for (const table of ["weddings", "guest_groups", "guests", "invitation_links", "wedding_events", "wedding_content", "media_assets", "music_tracks", "wishes", "admin_users"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
  }
});

test("public policies do not expose private guest, token or admin tables", () => {
  assert.doesNotMatch(migration, /guests_public_read|invitation_links_public_read|admin_users_public_read/);
  assert.match(migration, /create policy wishes_public_read/);
  assert.match(migration, /status = 'approved'/);
});

test("admin mapping is singleton and email confirmation is required", () => {
  assert.match(migration, /create unique index if not exists one_admin_mapping/);
  assert.match(migration, /email_confirmed_at/);
  assert.match(fs.readFileSync(path.join(root, "backend", "lib", "auth", "admin.ts"), "utf8"), /user\.email_confirmed_at/);
});

test("service role key is not referenced by browser client", () => {
  const browserClient = fs.readFileSync(path.join(root, "frontend", "lib", "supabase", "client.ts"), "utf8");
  assert.doesNotMatch(browserClient, /SERVICE_ROLE|service_role/i);
});
