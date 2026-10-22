import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const wedding="22222222-2222-2222-2222-222222222222";
const used="11111111-1111-1111-1111-111111111111";
const unused="33333333-3333-3333-3333-333333333333";
test("cleanup and abuse migrations execute on PostgreSQL with real triggers and function permissions",async(t)=>{
  const db=new PGlite();
  try{
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema storage;
      create table public.weddings(id uuid primary key);
      create table public.wedding_content(id serial primary key,wedding_id uuid references public.weddings(id) on delete cascade,section_key text,content jsonb);
      create table public.media_assets(id uuid primary key,wedding_id uuid references public.weddings(id) on delete cascade,storage_path text,mime_type text,is_public boolean default false,created_at timestamptz default now());
      create table public.music_tracks(id serial primary key,wedding_id uuid,media_asset_id uuid references public.media_assets(id));
      create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));
      create function storage.foldername(value text) returns text[] language sql immutable as $$ select (string_to_array(value,'/'))[1:array_length(string_to_array(value,'/'),1)-1] $$;
      create function public.app_can_manage_wedding(value uuid) returns boolean language sql stable as $$ select value::text=current_setting('test.wedding',true) $$;
      create table public.wishes(id uuid);
      create function public.submit_public_wish(text,text,text,text,text) returns boolean language sql as $$ select true $$;
      create function public.submit_invitation_response(text,text,text,text,text) returns boolean language sql as $$ select true $$;
      grant usage on schema public,storage to anon,authenticated,service_role;
      grant all on all tables in schema public to authenticated;
      grant usage,select on all sequences in schema public to authenticated;
      grant all on storage.objects to authenticated;
      alter table storage.objects enable row level security;
      create policy storage_read on storage.objects for select to authenticated using(true);
      insert into public.weddings values('${wedding}');
      insert into public.media_assets(id,wedding_id,storage_path,mime_type,is_public) values('${used}','${wedding}','${wedding}/used.webp','image/webp',true),('${unused}','${wedding}','${wedding}/unused.webp','image/webp',true);
      insert into public.wedding_content(wedding_id,section_key,content) values('${wedding}','hero','{"cover_media_id":"${used}"}');
      insert into storage.objects values('wedding-private','${wedding}/used.webp'),('wedding-private','${wedding}/unused.webp');
      select set_config('test.wedding','${wedding}',false);
    `);
    const cleanup=fs.readFileSync("supabase/migrations/202610220002_safe_media_cleanup.sql","utf8");
    const bundle=fs.readFileSync("supabase/sql-editor/20261022_security_and_media.sql","utf8");
    // Test the exact artifact supplied for SQL Editor, then reapply cleanup.
    for(const name of ["202610220001_backend_abuse_controls.sql","202610220002_safe_media_cleanup.sql"]){
      const part=fs.readFileSync(`supabase/migrations/${name}`,"utf8").replace(/^\s*(?:begin|commit);\s*$/gim,"").trim();
      assert.ok(bundle.includes(part),`SQL Editor bundle is stale: ${name}`);
    }
    await db.exec(bundle);await db.exec(cleanup);
    await t.test("used media cannot be staged or directly removed",async()=>{
      await db.exec("set role authenticated");
      await assert.rejects(db.query("select public.begin_media_deletion($1)",[used]),e=>e.code==="23514");
      await assert.rejects(db.query("delete from public.media_assets where id=$1",[used]),e=>e.code==="23514");
      assert.equal((await db.query("delete from storage.objects where name=$1 returning name",[`${wedding}/used.webp`])).rows.length,0);
      await db.exec("reset role");
    });
    await t.test("staged deletion blocks new assignments, publication and completion while bytes remain",async()=>{
      await db.exec("set role authenticated");
      assert.equal((await db.query("select public.begin_media_deletion($1) as path",[unused])).rows[0].path,`${wedding}/unused.webp`);
      await assert.rejects(db.query("update public.wedding_content set content=$1",[JSON.stringify({cover_media_id:unused})]),e=>e.code==="23514");
      await assert.rejects(db.query("update public.media_assets set is_public=true where id=$1",[unused]),e=>e.code==="23514");
      await assert.rejects(db.query("select public.complete_media_deletion($1)",[unused]),e=>e.code==="23514");
      // Claim is idempotent after a Storage outage/retry.
      assert.equal((await db.query("select public.begin_media_deletion($1) as path",[unused])).rows[0].path,`${wedding}/unused.webp`);
      await db.query("delete from storage.objects where name=$1",[`${wedding}/unused.webp`]);
      assert.equal((await db.query("select public.complete_media_deletion($1) as ok",[unused])).rows[0].ok,true);
      assert.equal((await db.query("select * from public.media_assets where id=$1",[unused])).rows.length,0);
      await assert.rejects(db.query("update public.wedding_content set content=$1",[JSON.stringify({cover_media_id:unused})]),e=>e.code==="23514");
      await db.exec("reset role");
    });
    await t.test("music references and foreign-wedding callers cannot claim media",async()=>{
      await db.exec(`insert into public.music_tracks(wedding_id,media_asset_id) values('${wedding}','${used}');update public.wedding_content set content='{}';set role authenticated;`);
      await assert.rejects(db.query("select public.begin_media_deletion($1)",[used]),e=>e.code==="23514");
      await db.query("select set_config('test.wedding','other',false)");
      await assert.rejects(db.query("select public.begin_media_deletion($1)",[used]),e=>e.code==="42501");
      await db.exec("reset role");
    });
    await t.test("anonymous RPC bypass is denied and durable rate counters enforce exact budget",async()=>{
      await db.exec("set role anon");
      await assert.rejects(db.query("select public.submit_public_wish('a','b','c','d','groom')"),e=>e.code==="42501");
      await assert.rejects(db.query("select public.consume_request_limit('wish',$1)",["a".repeat(64)]),e=>e.code==="42501");
      await db.exec("reset role;set role service_role;");
      for(let i=0;i<5;i++)assert.equal((await db.query("select public.consume_request_limit('wish',$1) as seconds",["a".repeat(64)])).rows[0].seconds,0);
      assert.ok((await db.query("select public.consume_request_limit('wish',$1) as seconds",["a".repeat(64)])).rows[0].seconds>0);
      await db.exec("reset role");
    });
  }finally{await db.close();}
});
