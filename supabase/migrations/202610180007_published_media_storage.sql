-- Allow guests to sign only explicitly published assets of published weddings.
-- The bucket remains private; drafts and unregistered objects stay inaccessible.
begin;

drop policy if exists wedding_media_public_select on storage.objects;
create policy wedding_media_public_select on storage.objects
for select to anon, authenticated
using (
  bucket_id = 'wedding-private'
  and exists (
    select 1
    from public.media_assets as asset
    join public.weddings as wedding on wedding.id = asset.wedding_id
    where asset.storage_path = storage.objects.name
      and asset.is_public = true
      and wedding.is_published = true
  )
);

commit;
