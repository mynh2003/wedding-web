import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("permanent guest deletion cascades through guest_id without deleting standalone wishes", () => {
  const migration = fs.readFileSync("supabase/migrations/202610180010_linked_wish_deletion.sql", "utf8");
  assert.match(migration, /drop constraint wishes_guest_id_fkey/);
  assert.match(migration, /foreign key \(guest_id\) references public\.guests\(id\) on delete cascade/);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.wishes/i);
  assert.doesNotMatch(migration, /guest_id\s+set\s+not\s+null/i);
});

test("existing deletion trigger removes the approved public wish after cascade", () => {
  const projection = fs.readFileSync("supabase/migrations/202610180004_wish_sides.sql", "utf8");
  const trigger = fs.readFileSync("supabase/migrations/202610170001_phase5_wishes.sql", "utf8");
  assert.match(projection, /tg_op = 'DELETE'[\s\S]*delete from public\.public_wishes where id = coalesce\(old\.id, new\.id\)/);
  assert.match(trigger, /create trigger wishes_public_projection after insert or update or delete on public\.wishes/);
});
