-- Include the guest's family branch in token resolution so the public
-- invitation route can render the matching single-family variant.

drop function if exists public.resolve_invitation_token(text);

create function public.resolve_invitation_token(input_token_hash text)
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
  limit 1;
$$;

revoke all on function public.resolve_invitation_token(text) from public;
grant execute on function public.resolve_invitation_token(text) to anon, authenticated;
