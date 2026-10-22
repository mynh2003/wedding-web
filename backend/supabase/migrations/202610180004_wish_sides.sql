-- Preserve the sender's invitation side through moderation and realtime updates.
alter table public.wishes add column side text check (side in ('groom', 'bride'));
alter table public.public_wishes add column side text check (side in ('groom', 'bride'));

create or replace function public.sync_public_wish()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.status = 'approved' and new.status <> 'approved') then
    delete from public.public_wishes where id = coalesce(old.id, new.id);
  end if;
  if tg_op <> 'DELETE' and new.status = 'approved' then
    insert into public.public_wishes (id, wedding_slug, author_name, message, created_at, side)
    select new.id, w.slug, new.author_name, new.message, new.created_at, new.side from public.weddings w where w.id = new.wedding_id
    on conflict (id) do update set author_name = excluded.author_name, message = excluded.message, side = excluded.side;
  end if;
  return coalesce(new, old);
end;
$$;

drop function public.submit_public_wish(text, text, text, text);

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

