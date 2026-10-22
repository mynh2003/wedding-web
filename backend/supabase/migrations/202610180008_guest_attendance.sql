-- RSVP is private guest data. Only a valid personal link can update it.
begin;

alter table public.guests add column attendance_status text not null default 'unconfirmed'
  check (attendance_status in ('unconfirmed', 'attending', 'not-attending'));
alter table public.guests add column responded_at timestamptz;

-- Keep the latest linked wish if older integrations created duplicates.
with ranked as (
  select id, row_number() over (partition by guest_id order by created_at desc, id desc) as position
  from public.wishes where guest_id is not null
)
delete from public.wishes where id in (select id from ranked where position > 1);

create unique index wishes_one_per_guest on public.wishes(guest_id) where guest_id is not null;

create function public.submit_invitation_response(
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
  where il.token_hash = input_token_hash and il.revoked_at is null
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
