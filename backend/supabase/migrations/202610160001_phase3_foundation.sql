-- Phase 3: schema, server authorization helpers and deny-by-default RLS.
-- Run this migration in Supabase before creating the single admin mapping.

create extension if not exists pgcrypto;

create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  groom_name text not null check (char_length(groom_name) between 1 and 120),
  bride_name text not null check (char_length(bride_name) between 1 and 120),
  wedding_date timestamptz not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_groups (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null check (name in ('groom', 'bride')),
  created_at timestamptz not null default now(),
  unique (wedding_id, name)
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_group_id uuid not null references public.guest_groups(id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 160),
  contact_note text check (contact_note is null or char_length(contact_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invitation_links (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.wedding_events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  starts_at timestamptz not null,
  location_name text check (location_name is null or char_length(location_name) <= 200),
  location_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wedding_content (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  section_key text not null check (section_key ~ '^[a-z0-9_-]{1,80}$'),
  content jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (wedding_id, section_key)
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  storage_path text not null check (char_length(storage_path) between 1 and 500),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/ogg')), 
  alt_text text check (alt_text is null or char_length(alt_text) <= 300),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  sort_order integer not null default 0,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 120),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Exactly one active admin mapping is supported for the MVP. Inserts are bootstrap-only.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  wedding_id uuid not null unique references public.weddings(id) on delete cascade,
  singleton boolean not null default true check (singleton),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists one_admin_mapping on public.admin_users (singleton);

create index if not exists guests_wedding_id_idx on public.guests(wedding_id);
create index if not exists guest_groups_wedding_id_idx on public.guest_groups(wedding_id);
create index if not exists invitation_links_token_hash_idx on public.invitation_links(token_hash);
create index if not exists wedding_events_wedding_id_idx on public.wedding_events(wedding_id, starts_at);
create index if not exists wedding_content_wedding_id_idx on public.wedding_content(wedding_id, is_published);
create index if not exists wishes_public_idx on public.wishes(wedding_id, status, created_at desc);

create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and is_active = true
      and (auth.jwt() ->> 'email_confirmed_at') is not null
  );
$$;

create or replace function public.app_can_manage_wedding(target_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.app_is_admin() and exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and wedding_id = target_wedding_id
      and is_active = true
  );
$$;

alter table public.weddings enable row level security;
alter table public.guest_groups enable row level security;
alter table public.guests enable row level security;
alter table public.invitation_links enable row level security;
alter table public.wedding_events enable row level security;
alter table public.wedding_content enable row level security;
alter table public.media_assets enable row level security;
alter table public.music_tracks enable row level security;
alter table public.wishes enable row level security;
alter table public.admin_users enable row level security;

-- No policy grants anonymous access to guest, token, admin or contact data.
create policy weddings_public_read on public.weddings for select to anon, authenticated using (is_published = true);
create policy weddings_admin_all on public.weddings for all to authenticated using (public.app_can_manage_wedding(id)) with check (public.app_can_manage_wedding(id));

create policy guest_groups_admin_all on public.guest_groups for all to authenticated using (public.app_can_manage_wedding(wedding_id)) with check (public.app_can_manage_wedding(wedding_id));
create policy guests_admin_all on public.guests for all to authenticated using (public.app_can_manage_wedding(wedding_id)) with check (public.app_can_manage_wedding(wedding_id));
create policy invitation_links_admin_all on public.invitation_links for all to authenticated using (public.app_can_manage_wedding(wedding_id)) with check (public.app_can_manage_wedding(wedding_id));
create policy wedding_events_public_read on public.wedding_events for select to anon, authenticated using (exists (select 1 from public.weddings w where w.id = wedding_id and w.is_published));
create policy wedding_events_admin_all on public.wedding_events for all to authenticated using (public.app_can_manage_wedding(wedding_id)) with check (public.app_can_manage_wedding(wedding_id));
create policy wedding_content_public_read on public.wedding_content for select to anon, authenticated using (is_published = true and exists (select 1 from public.weddings w where w.id = wedding_id and w.is_published));
create policy wedding_content_admin_all on public.wedding_content for all to authenticated using (public.app_can_manage_wedding(wedding_id)) with check (public.app_can_manage_wedding(wedding_id));
create policy media_assets_public_read on public.media_assets for select to anon, authenticated using (is_public = true and exists (select 1 from public.weddings w where w.id = wedding_id and w.is_published));
create policy media_assets_admin_all on public.media_assets for all to authenticated using (public.app_can_manage_wedding(wedding_id)) with check (public.app_can_manage_wedding(wedding_id));
create policy music_tracks_public_read on public.music_tracks for select to anon, authenticated using (is_enabled = true and exists (select 1 from public.weddings w where w.id = wedding_id and w.is_published));
create policy music_tracks_admin_all on public.music_tracks for all to authenticated using (public.app_can_manage_wedding(wedding_id)) with check (public.app_can_manage_wedding(wedding_id));
create policy wishes_public_read on public.wishes for select to anon, authenticated using (status = 'approved' and exists (select 1 from public.weddings w where w.id = wedding_id and w.is_published));
create policy wishes_admin_all on public.wishes for all to authenticated using (public.app_can_manage_wedding(wedding_id)) with check (public.app_can_manage_wedding(wedding_id));
create policy admin_users_self_read on public.admin_users for select to authenticated using (user_id = auth.uid() and public.app_is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.weddings, public.wedding_events, public.wedding_content, public.media_assets, public.music_tracks, public.wishes to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
