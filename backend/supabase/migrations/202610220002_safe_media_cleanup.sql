-- Apply after existing media/content migrations. Does not delete existing files.
begin;
alter table public.media_assets add column if not exists deleting_at timestamptz;
create index if not exists media_assets_path_idx on public.media_assets(storage_path);
create index if not exists media_assets_library_idx on public.media_assets(wedding_id, created_at desc, id desc);

create or replace function public.app_content_references_media(input_content jsonb, input_id uuid, input_path text)
returns boolean language sql immutable set search_path = public, pg_temp as $$
  select position(lower(input_id::text) in lower(coalesce(input_content, '{}'::jsonb)::text)) > 0
    or position(lower(input_path) in lower(coalesce(input_content, '{}'::jsonb)::text)) > 0
    or position(lower(replace(input_path, '/', '%2f')) in lower(coalesce(input_content, '{}'::jsonb)::text)) > 0;
$$;
revoke all on function public.app_content_references_media(jsonb, uuid, text) from public, anon, authenticated;

create or replace function public.guard_content_media_references()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare field record; reference text;
begin
  -- Serialize content assignment and file deletion for this wedding.
  perform 1 from public.weddings where id = new.wedding_id for update;
  for field in select key, value from jsonb_each(new.content) loop
    if field.key ~ '_media_id$' and jsonb_typeof(field.value) = 'string' then
      reference := field.value #>> '{}';
      if reference <> '' and not exists (
        select 1 from public.media_assets where id::text = reference and wedding_id = new.wedding_id and deleting_at is null
      ) then raise exception 'media unavailable' using errcode = '23514'; end if;
    elsif field.key ~ '_media_ids$' and jsonb_typeof(field.value) = 'array' then
      for reference in select jsonb_array_elements_text(field.value) loop
        if not exists (select 1 from public.media_assets where id::text = reference and wedding_id = new.wedding_id and deleting_at is null)
          then raise exception 'media unavailable' using errcode = '23514'; end if;
      end loop;
    end if;
  end loop;
  if exists (select 1 from public.media_assets asset where asset.wedding_id = new.wedding_id and asset.deleting_at is not null
    and public.app_content_references_media(new.content, asset.id, asset.storage_path)) then
    raise exception 'media deletion in progress' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists content_media_reference_guard on public.wedding_content;
create trigger content_media_reference_guard before insert or update of content on public.wedding_content
  for each row execute function public.guard_content_media_references();
revoke all on function public.guard_content_media_references() from public, anon, authenticated;

create or replace function public.begin_media_deletion(input_id uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare asset public.media_assets%rowtype;
begin
  select * into asset from public.media_assets where id = input_id;
  if not found or not coalesce(public.app_can_manage_wedding(asset.wedding_id), false) then raise exception 'not allowed' using errcode = '42501'; end if;
  perform 1 from public.weddings where id = asset.wedding_id for update;
  select * into asset from public.media_assets where id = input_id for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.wedding_content where wedding_id = asset.wedding_id
    and public.app_content_references_media(content, asset.id, asset.storage_path))
    or exists (select 1 from public.music_tracks where media_asset_id = asset.id)
    or exists (select 1 from public.media_assets where wedding_id = asset.wedding_id and storage_path = asset.storage_path and id <> asset.id)
    then raise exception 'media still referenced' using errcode = '23514'; end if;
  update public.media_assets set deleting_at = coalesce(deleting_at, now()), is_public = false where id = input_id;
  return asset.storage_path;
end;
$$;
revoke all on function public.begin_media_deletion(uuid) from public, anon;
grant execute on function public.begin_media_deletion(uuid) to authenticated;

create or replace function public.complete_media_deletion(input_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare asset public.media_assets%rowtype;
begin
  select * into asset from public.media_assets where id = input_id;
  if not found or not coalesce(public.app_can_manage_wedding(asset.wedding_id), false) then raise exception 'not allowed' using errcode = '42501'; end if;
  perform 1 from public.weddings where id = asset.wedding_id for update;
  select * into asset from public.media_assets where id = input_id for update;
  if not found then raise exception 'not found' using errcode = 'P0002'; end if;
  if asset.deleting_at is null or exists (select 1 from storage.objects where bucket_id = 'wedding-private' and name = asset.storage_path)
    then raise exception 'file deletion incomplete' using errcode = '23514'; end if;
  if exists (select 1 from public.wedding_content where wedding_id = asset.wedding_id
    and public.app_content_references_media(content, asset.id, asset.storage_path)) then
    raise exception 'media still referenced' using errcode = '23514';
  end if;
  delete from public.media_assets where id = input_id;
  return true;
end;
$$;
revoke all on function public.complete_media_deletion(uuid) from public, anon;
grant execute on function public.complete_media_deletion(uuid) to authenticated;

create or replace function public.guard_music_media_reference()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform 1 from public.weddings where id = new.wedding_id for update;
  if not exists (select 1 from public.media_assets where id = new.media_asset_id and wedding_id = new.wedding_id and deleting_at is null) then
    raise exception 'media unavailable' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists music_media_reference_guard on public.music_tracks;
create trigger music_media_reference_guard before insert or update of media_asset_id on public.music_tracks
  for each row execute function public.guard_music_media_reference();
revoke all on function public.guard_music_media_reference() from public, anon, authenticated;

create or replace function public.guard_media_lifecycle()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then
    -- Allow the wedding's own cascade; ordinary deletion requires the safe flow.
    perform 1 from public.weddings where id = old.wedding_id for update;
    if not found then return old; end if;
    if old.deleting_at is null or exists (select 1 from storage.objects where bucket_id = 'wedding-private' and name = old.storage_path)
      or exists (select 1 from public.wedding_content where wedding_id = old.wedding_id and public.app_content_references_media(content, old.id, old.storage_path)) then
      raise exception 'use safe media deletion' using errcode = '23514';
    end if;
    return old;
  end if;
  perform 1 from public.weddings where id = new.wedding_id for update;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.wedding_id <> old.wedding_id or new.storage_path <> old.storage_path then
      raise exception 'media identity is immutable' using errcode = '23514';
    end if;
    if old.deleting_at is not null and (new.deleting_at is null or new.is_public) then
      raise exception 'media deletion in progress' using errcode = '23514';
    end if;
    if old.deleting_at is null and new.deleting_at is not null and (
      exists (select 1 from public.wedding_content where wedding_id = old.wedding_id and public.app_content_references_media(content, old.id, old.storage_path))
      or exists (select 1 from public.music_tracks where media_asset_id = old.id)
    ) then raise exception 'media still referenced' using errcode = '23514'; end if;
  else
    if new.storage_path not like new.wedding_id::text || '/%' or new.deleting_at is not null
      or exists (select 1 from public.media_assets where storage_path = new.storage_path) then
      raise exception 'invalid media identity' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists media_lifecycle_guard on public.media_assets;
create trigger media_lifecycle_guard before insert or update or delete on public.media_assets
  for each row execute function public.guard_media_lifecycle();
revoke all on function public.guard_media_lifecycle() from public, anon, authenticated;

-- Storage API performs the actual object deletion, never SQL DELETE on storage.objects.
drop policy if exists wedding_media_admin_delete on storage.objects;
create policy wedding_media_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'wedding-private' and
  case when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.app_can_manage_wedding(((storage.foldername(name))[1])::uuid) else false end
  and not exists (select 1 from public.media_assets asset where asset.storage_path = storage.objects.name and asset.deleting_at is null));
commit;
