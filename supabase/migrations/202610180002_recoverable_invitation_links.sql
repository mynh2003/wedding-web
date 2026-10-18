-- Existing links keep working. Only newly created links have a recoverable ciphertext.
-- Existing invitation_links RLS restricts both hashes and ciphertext to wedding admins.
alter table public.invitation_links
  add column if not exists token_encrypted text
  check (token_encrypted is null or token_encrypted ~ '^v1\.[a-f0-9]{24}\.[a-f0-9]{32}\.[a-f0-9]{128}$');

create index if not exists invitation_links_active_guest_idx
  on public.invitation_links(wedding_id, guest_id, created_at desc)
  where revoked_at is null;

-- Serialize replacements per guest. A failed insert rolls back revocation as well.
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
    where id = target_guest_id for update;
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
