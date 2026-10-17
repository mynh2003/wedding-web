-- Phase 5: public wish submission, moderation and a safe realtime projection.
create table if not exists public.public_wishes (
  id uuid primary key default gen_random_uuid(),
  wedding_slug text not null references public.weddings(slug) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 120),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.wish_rate_limits (
  fingerprint text primary key check (char_length(fingerprint) between 16 and 128),
  window_started_at timestamptz not null default now(),
  submission_count integer not null default 0 check (submission_count >= 0)
);

create index if not exists public_wishes_slug_created_idx on public.public_wishes(wedding_slug, created_at desc);
alter table public.public_wishes enable row level security;
alter table public.wish_rate_limits enable row level security;
create policy public_wishes_public_read on public.public_wishes for select to anon, authenticated
  using (exists (select 1 from public.weddings w where w.slug = wedding_slug and w.is_published));
create policy public_wishes_admin_all on public.public_wishes for all to authenticated
  using (exists (select 1 from public.weddings w where w.slug = wedding_slug and public.app_can_manage_wedding(w.id)))
  with check (exists (select 1 from public.weddings w where w.slug = wedding_slug and public.app_can_manage_wedding(w.id)));
revoke all on public.wish_rate_limits from anon, authenticated;
grant select on public.public_wishes to anon, authenticated;
grant all on public.public_wishes to authenticated;

create or replace function public.sync_public_wish()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.status = 'approved' and new.status <> 'approved') then
    delete from public.public_wishes where id = coalesce(old.id, new.id);
  end if;
  if tg_op <> 'DELETE' and new.status = 'approved' then
    insert into public.public_wishes (id, wedding_slug, author_name, message, created_at)
    select new.id, w.slug, new.author_name, new.message, new.created_at from public.weddings w where w.id = new.wedding_id
    on conflict (id) do update set author_name = excluded.author_name, message = excluded.message;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists wishes_public_projection on public.wishes;
create trigger wishes_public_projection after insert or update or delete on public.wishes
for each row execute function public.sync_public_wish();

create or replace function public.submit_public_wish(input_slug text, input_author text, input_message text, input_fingerprint text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare current_count integer;
begin
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
  insert into public.wishes(wedding_id, author_name, message)
    select id, trim(input_author), trim(input_message) from public.weddings where slug = lower(trim(input_slug)) and is_published;
  return true;
end;
$$;
revoke all on function public.submit_public_wish(text, text, text, text) from public;
grant execute on function public.submit_public_wish(text, text, text, text) to anon, authenticated;

alter publication supabase_realtime add table public.public_wishes;
