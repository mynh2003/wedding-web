-- Apply after 202610180008_guest_attendance.sql.
begin;

alter table public.guests add column deleted_at timestamptz;
create index guests_lifecycle_idx on public.guests(wedding_id, deleted_at, created_at desc);

-- Serialize trash/restore/purge with RSVP and link replacement on the guest row.
create function public.manage_guest_lifecycle(target_guest_id uuid, input_action text)
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  target_wedding uuid;
  deletion_time timestamptz;
begin
  select wedding_id, deleted_at into target_wedding, deletion_time
    from public.guests where id = target_guest_id for update;
  if target_wedding is null or not public.app_can_manage_wedding(target_wedding) then
    raise exception 'Guest not found or unauthorized' using errcode = 'P0002';
  end if;
  if input_action = 'trash' then
    update public.guests set deleted_at = coalesce(deleted_at, clock_timestamp()), updated_at = clock_timestamp()
      where id = target_guest_id;
  elsif input_action = 'restore' then
    if deletion_time is null then
      raise exception 'Guest is not in trash' using errcode = '23514';
    end if;
    update public.guests set deleted_at = null, updated_at = clock_timestamp() where id = target_guest_id;
  elsif input_action = 'purge' then
    if deletion_time is null then
      raise exception 'Move guest to trash before permanent deletion' using errcode = '23514';
    end if;
    -- FKs remove invitation links; migration 010 also cascades linked wishes.
    delete from public.guests where id = target_guest_id;
  else
    raise exception 'Invalid guest action' using errcode = '23514';
  end if;
end;
$$;
revoke all on function public.manage_guest_lifecycle(uuid, text) from public, anon;
grant execute on function public.manage_guest_lifecycle(uuid, text) to authenticated;

-- Public resolvers and submission functions below must all exclude trashed guests.

create or replace function public.resolve_invitation_token(input_token_hash text)
returns table (
  guest_name text,
  wedding_slug text,
  wedding_id uuid,
  guest_group text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select g.display_name, w.slug, w.id, gg.name
  from public.invitation_links il
  join public.guests g on g.id = il.guest_id
  join public.guest_groups gg on gg.id = g.guest_group_id
  join public.weddings w on w.id = il.wedding_id and w.is_published = true
  where il.token_hash = input_token_hash
    and il.revoked_at is null
    and g.deleted_at is null
    and g.wedding_id = il.wedding_id
    and gg.wedding_id = g.wedding_id
  limit 1;
$$;

revoke all on function public.resolve_invitation_token(text) from public;
grant execute on function public.resolve_invitation_token(text) to anon, authenticated;

create or replace function public.replace_invitation_link(
  target_guest_id uuid, new_token_hash text, new_token_encrypted text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare target_wedding_id uuid;
begin
  select wedding_id into target_wedding_id from public.guests
    where id = target_guest_id and deleted_at is null for update;
  if target_wedding_id is null or not public.app_can_manage_wedding(target_wedding_id) then
    raise exception 'Guest not found or unauthorized';
  end if;
  if new_token_encrypted is null then
    raise exception 'Encrypted token is required';
  end if;
  update public.invitation_links set revoked_at = now()
    where guest_id = target_guest_id and wedding_id = target_wedding_id and revoked_at is null;
  insert into public.invitation_links(wedding_id, guest_id, token_hash, token_encrypted)
    values(target_wedding_id, target_guest_id, new_token_hash, new_token_encrypted);
end;
$$;
revoke all on function public.replace_invitation_link(uuid, text, text) from public, anon;
grant execute on function public.replace_invitation_link(uuid, text, text) to authenticated;

create or replace function public.submit_invitation_response(
  input_token_hash text, input_author text, input_message text,
  input_attendance text, input_fingerprint text
)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target_guest uuid;
  target_wedding uuid;
  target_side text;
  current_count integer;
begin
  if input_attendance is null or input_attendance not in ('attending', 'not-attending') then
    raise exception 'invalid attendance';
  end if;
  if input_author is null or input_message is null
    or length(trim(input_author)) not between 1 and 120
    or length(trim(input_message)) not between 1 and 2000 then
    raise exception 'invalid wish';
  end if;
  if input_fingerprint is null or length(input_fingerprint) not between 16 and 128 then
    raise exception 'invalid fingerprint';
  end if;

  -- Serialize repeat submissions and prevent a revoked link from writing.
  select g.id, g.wedding_id, gg.name into target_guest, target_wedding, target_side
  from public.invitation_links il
  join public.guests g on g.id = il.guest_id and g.wedding_id = il.wedding_id
  join public.guest_groups gg on gg.id = g.guest_group_id and gg.wedding_id = g.wedding_id
  join public.weddings w on w.id = g.wedding_id and w.is_published
  where il.token_hash = input_token_hash and il.revoked_at is null and g.deleted_at is null
  for update of g, il;
  if target_guest is null then raise exception 'invitation unavailable'; end if;

  insert into public.wish_rate_limits(fingerprint) values (input_fingerprint)
    on conflict (fingerprint) do nothing;
  update public.wish_rate_limits set
    window_started_at = case when window_started_at < now() - interval '10 minutes' then now() else window_started_at end,
    submission_count = case when window_started_at < now() - interval '10 minutes' then 0 else submission_count end
    where fingerprint = input_fingerprint;
  select submission_count into current_count from public.wish_rate_limits where fingerprint = input_fingerprint for update;
  if current_count >= 5 then raise exception 'rate limited'; end if;
  update public.wish_rate_limits set submission_count = submission_count + 1 where fingerprint = input_fingerprint;

  update public.guests set attendance_status = input_attendance, responded_at = clock_timestamp(), updated_at = clock_timestamp()
    where id = target_guest;
  insert into public.wishes(wedding_id, guest_id, author_name, message, side)
    values (target_wedding, target_guest, trim(input_author), trim(input_message), target_side)
    on conflict (guest_id) where guest_id is not null do update set
      author_name = excluded.author_name, message = excluded.message, side = excluded.side,
      status = 'pending', reviewed_at = null, created_at = clock_timestamp();
  return true;
end;
$$;

revoke all on function public.submit_invitation_response(text, text, text, text, text) from public;
grant execute on function public.submit_invitation_response(text, text, text, text, text) to anon, authenticated;


commit;
