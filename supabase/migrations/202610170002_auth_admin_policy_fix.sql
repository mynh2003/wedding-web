-- Fix admin authorization when the access token does not contain
-- email_confirmed_at even though auth.users confirms the email.
create or replace function public.app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users a
    join auth.users u on u.id = a.user_id
    where a.user_id = auth.uid()
      and a.is_active = true
      and u.email_confirmed_at is not null
  );
$$;

create or replace function public.app_can_manage_wedding(target_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.app_is_admin() and exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and wedding_id = target_wedding_id
      and is_active = true
  );
$$;
