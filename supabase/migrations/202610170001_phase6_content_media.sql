-- Phase 6: private media storage and structured, publishable wedding content.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-private', 'wedding-private', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/ogg'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

create policy wedding_media_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'wedding-private' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.app_can_manage_wedding(((storage.foldername(name))[1])::uuid));
create policy wedding_media_admin_select on storage.objects for select to authenticated
using (bucket_id = 'wedding-private' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.app_can_manage_wedding(((storage.foldername(name))[1])::uuid));
create policy wedding_media_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'wedding-private' and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.app_can_manage_wedding(((storage.foldername(name))[1])::uuid));

create index if not exists media_assets_public_idx on public.media_assets(wedding_id, is_public, created_at desc);
