-- Apply after 202610180009_guest_deletion.sql.
-- Soft deletion preserves wishes for restoration. Permanent deletion removes
-- only wishes linked by guest_id; standalone wishes remain admin-managed.
begin;

alter table public.wishes drop constraint wishes_guest_id_fkey;
alter table public.wishes add constraint wishes_guest_id_fkey
  foreign key (guest_id) references public.guests(id) on delete cascade;

-- The existing wishes_public_projection DELETE trigger removes approved copies
-- from public_wishes when linked wishes are deleted by this cascade.

commit;
