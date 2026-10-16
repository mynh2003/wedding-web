import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const token = fs.readFileSync(path.join(root, "lib", "invitations", "token.ts"), "utf8");
const createRoute = fs.readFileSync(path.join(root, "app", "api", "admin", "guests", "route.ts"), "utf8");
const linkRoute = fs.readFileSync(path.join(root, "app", "api", "admin", "guests", "[id]", "link", "route.ts"), "utf8");
const personalPage = fs.readFileSync(path.join(root, "app", "i", "[token]", "page.tsx"), "utf8");

test("tokens use CSPRNG and SHA-256, never plaintext storage", () => {
  assert.match(token, /randomBytes\(32\)/);
  assert.match(token, /createHash\("sha256"\)/);
  assert.match(createRoute, /token_hash: tokenHash/);
  assert.doesNotMatch(createRoute, /rawToken\s*:/);
});

test("admin guest routes enforce server authorization and do not cache", () => {
  assert.match(createRoute, /getAdmin\(\)/);
  assert.match(createRoute, /Cache-Control.*no-store/);
  assert.match(linkRoute, /revoked_at/);
});

test("personal token page is dynamic and hashes before RPC resolution", () => {
  assert.match(personalPage, /dynamic = "force-dynamic"/);
  assert.match(personalPage, /noStore\(\)/);
  assert.match(personalPage, /hashInvitationToken\(token\)/);
  assert.doesNotMatch(personalPage, /select\("token_hash/);
});
