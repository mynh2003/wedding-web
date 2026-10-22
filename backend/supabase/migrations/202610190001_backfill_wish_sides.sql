-- Restore the sending side for older personal-link wishes. Do not infer it
-- from the invitation currently being viewed or from the author's name.
begin;

-- Some databases have not applied the original wish-sides migration.
alter table public.wishes
  add column if not exists side text check (side in ('groom', 'bride'));
alter table public.public_wishes
  add column if not exists side text check (side in ('groom', 'bride'));

update public.wishes wish
set side = family.name
from public.guests guest
join public.guest_groups family
  on family.id = guest.guest_group_id and family.wedding_id = guest.wedding_id
where wish.guest_id = guest.id
  and wish.wedding_id = guest.wedding_id
  and wish.side is null
  and family.name in ('groom', 'bride');

-- Also repair approved projections created before side was published.
update public.public_wishes published
set side = wish.side
from public.wishes wish
join public.weddings wedding on wedding.id = wish.wedding_id
where published.id = wish.id
  and published.wedding_slug = wedding.slug
  and published.side is distinct from wish.side;

-- Ensure new public submissions keep their sending side on older schemas.
drop function if exists public.submit_public_wish(text, text, text, text);

create or replace function public.submit_public_wish(input_slug text, input_author text, input_message text, input_fingerprint text, input_side text default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare current_count integer;
begin
  if input_side is not null and input_side not in ('groom', 'bride') then
    raise exception 'invalid wish side';
  end if;
  if length(trim(input_author)) not between 1 and 120 or length(trim(input_message)) not between 1 and 2000 then
    raise exception 'invalid wish';
  end if;
  if not exists (select 1 from public.weddings where slug = lower(trim(input_slug)) and is_published) then
    raise exception 'wedding unavailable';
  end if;
  insert into public.wish_rate_limits(fingerprint) values (input_fingerprint)
    on conflict (fingerprint) do nothing;
  update public.wish_rate_limits set
    window_started_at = case when window_started_at < now() - interval '10 minutes' then now() else window_started_at end,
    submission_count = case when window_started_at < now() - interval '10 minutes' then 0 else submission_count end
    where fingerprint = input_fingerprint;
  select submission_count into current_count from public.wish_rate_limits where fingerprint = input_fingerprint for update;
  if current_count >= 5 then raise exception 'rate limited'; end if;
  update public.wish_rate_limits set submission_count = submission_count + 1 where fingerprint = input_fingerprint;
  insert into public.wishes(wedding_id, author_name, message, side)
    select id, trim(input_author), trim(input_message), input_side from public.weddings where slug = lower(trim(input_slug)) and is_published;
  return true;
end;
$$;
revoke all on function public.submit_public_wish(text, text, text, text, text) from public;
grant execute on function public.submit_public_wish(text, text, text, text, text) to anon, authenticated;


commit;
