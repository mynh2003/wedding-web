-- Apply after 202610180010_linked_wish_deletion.sql.
-- Keep moderation decisions for restoration, but never publish a trashed guest's wish.
begin;

create or replace function public.sync_public_wish()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  guest_deleted_at timestamptz;
begin
  if tg_op = 'DELETE' then
    delete from public.public_wishes where id = old.id;
    return old;
  end if;

  if new.guest_id is not null then
    -- Serialize with guest trash/restore before writing the public projection.
    select deleted_at into guest_deleted_at from public.guests
      where id = new.guest_id and wedding_id = new.wedding_id for update;
    if not found or guest_deleted_at is not null then
      delete from public.public_wishes where id = new.id;
      return new;
    end if;
  end if;

  if new.status = 'approved' then
    insert into public.public_wishes (id, wedding_slug, author_name, message, created_at, side)
    select new.id, w.slug, new.author_name, new.message, new.created_at, new.side
      from public.weddings w where w.id = new.wedding_id
    on conflict (id) do update set author_name = excluded.author_name,
      message = excluded.message, side = excluded.side, created_at = excluded.created_at;
  else
    delete from public.public_wishes where id = new.id;
  end if;
  return new;
end;
$$;

create function public.sync_guest_wish_visibility()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.deleted_at is not null then
    delete from public.public_wishes p using public.wishes wish
      where p.id = wish.id and wish.guest_id = new.id and wish.wedding_id = new.wedding_id;
  else
    -- Restore only wishes still approved; pending/rejected wishes stay hidden.
    insert into public.public_wishes (id, wedding_slug, author_name, message, created_at, side)
    select wish.id, wedding.slug, wish.author_name, wish.message, wish.created_at, wish.side
      from public.wishes wish join public.weddings wedding on wedding.id = wish.wedding_id
      where wish.guest_id = new.id and wish.wedding_id = new.wedding_id and wish.status = 'approved'
    on conflict (id) do update set author_name = excluded.author_name,
      message = excluded.message, side = excluded.side, created_at = excluded.created_at;
  end if;
  return new;
end;
$$;

create trigger guests_wish_visibility after update of deleted_at on public.guests
for each row when (old.deleted_at is distinct from new.deleted_at)
execute function public.sync_guest_wish_visibility();

create function public.guard_inactive_guest_wish_approval()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  guest_deleted_at timestamptz;
begin
  if new.status = 'approved' and new.guest_id is not null then
    select deleted_at into guest_deleted_at from public.guests
      where id = new.guest_id and wedding_id = new.wedding_id for update;
    if not found or guest_deleted_at is not null then
      raise exception 'Restore guest before approving their wish' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger wishes_active_guest_approval before insert or update of status, guest_id on public.wishes
for each row execute function public.guard_inactive_guest_wish_approval();

-- Direct public reads must obey the same visibility as the public projection.
drop policy wishes_public_read on public.wishes;
create policy wishes_public_read on public.wishes for select to anon, authenticated
  using (status = 'approved' and exists (select 1 from public.public_wishes p where p.id = wishes.id));

-- Repair visibility for guests already in trash when this migration is applied.
delete from public.public_wishes p using public.wishes wish, public.guests guest
  where p.id = wish.id and wish.guest_id = guest.id and guest.deleted_at is not null;

revoke all on function public.sync_guest_wish_visibility() from public, anon, authenticated;
revoke all on function public.guard_inactive_guest_wish_approval() from public, anon, authenticated;

commit;
