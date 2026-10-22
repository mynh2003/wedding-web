import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "202610170001_phase6_content_media.sql"), "utf8");
const validation = fs.readFileSync(path.join(root, "lib", "validation", "content.ts"), "utf8");
const mediaRoute = fs.readFileSync(path.join(root, "app", "api", "admin", "media", "route.ts"), "utf8");
const contentRoute = fs.readFileSync(path.join(root, "app", "api", "admin", "content", "route.ts"), "utf8");

test("media storage is private, restricted and size/type limited", () => {
  assert.match(migration, /public = false/);
  assert.match(migration, /file_size_limit/);
  assert.match(migration, /wedding_media_admin_insert/);
  assert.match(mediaRoute, /MAX_MEDIA_BYTES/);
  assert.match(mediaRoute, /hasValidSignature/);
  assert.match(mediaRoute, /getAdmin\(\)/);
});

test("content accepts structured text only and is server-authorized", () => {
  assert.doesNotMatch(validation, /dangerouslySetInnerHTML/);
  assert.match(validation, /safeText/);
  assert.match(contentRoute, /getAdmin\(\)/g);
  assert.match(contentRoute, /revalidatePath\("\/"\)/);
});

test("public media endpoint only signs published assets", () => {
  const route = fs.readFileSync(path.join(root, "app", "api", "public", "media", "route.ts"), "utf8");
  assert.match(route, /eq\("is_public", true\)/);
  assert.match(route, /getSignedMediaUrls/);
  const signer = fs.readFileSync(path.join(root, "lib", "media", "signed-urls.ts"), "utf8");
  assert.match(signer, /createSignedUrls/);
  assert.doesNotMatch(route, /service_role/i);
});
