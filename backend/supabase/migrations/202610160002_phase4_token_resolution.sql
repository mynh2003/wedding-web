-- Phase 4: public token resolution returns only the guest display name and public wedding slug.
-- The raw token is hashed in the server route before this RPC is called.

create or replace function public.resolve_invitation_token(input_token_hash text)
returns table (guest_name text, wedding_slug text, wedding_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select g.display_name, w.slug, w.id
  from public.invitation_links il
  join public.guests g on g.id = il.guest_id
  join public.weddings w on w.id = il.wedding_id and w.is_published = true
  where il.token_hash = input_token_hash
    and il.revoked_at is null
  limit 1;
$$;

revoke all on function public.resolve_invitation_token(text) from public;
grant execute on function public.resolve_invitation_token(text) to anon, authenticated;
