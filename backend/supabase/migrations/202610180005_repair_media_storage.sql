-- Repair installations that skipped Phase 6 or have outdated storage policies.
-- Safe to rerun; existing files and media metadata are preserved.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-private', 'wedding-private', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/ogg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists wedding_media_admin_insert on storage.objects;
drop policy if exists wedding_media_admin_select on storage.objects;
drop policy if exists wedding_media_admin_delete on storage.objects;

create policy wedding_media_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'wedding-private' and
  case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.app_can_manage_wedding(((storage.foldername(name))[1])::uuid)
    else false end);

create policy wedding_media_admin_select on storage.objects for select to authenticated
using (bucket_id = 'wedding-private' and
  case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.app_can_manage_wedding(((storage.foldername(name))[1])::uuid)
    else false end);

create policy wedding_media_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'wedding-private' and
  case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.app_can_manage_wedding(((storage.foldername(name))[1])::uuid)
    else false end);

commit;
