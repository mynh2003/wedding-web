-- Initialize the information sections used by the admin dashboard.
-- Safe to rerun: existing JSON values and publish flags are preserved.
begin;

insert into public.wedding_content (wedding_id, section_key, content, is_published)
select
  w.id,
  'families',
  jsonb_build_object(
    'groom_father_name', '',
    'groom_mother_name', '',
    'bride_father_name', '',
    'bride_mother_name', '',
    'invitation_text', '',
    'lunar_date_text', '',
    'groom_ceremony_name', '',
    'bride_ceremony_name', '',
    'groom_ceremony_time', '',
    'bride_ceremony_time', '',
    'groom_venue_address', '',
    'bride_venue_address', '',
    'groom_map_url', '',
    'bride_map_url', ''
  ),
  false
from public.weddings w
on conflict (wedding_id, section_key) do update
set content = excluded.content || public.wedding_content.content,
    updated_at = now();

insert into public.wedding_content (wedding_id, section_key, content, is_published)
select
  w.id,
  'gifts',
  jsonb_build_object(
    'groom_bank_name', '',
    'groom_account_name', w.groom_name,
    'groom_account_number', '',
    'groom_qr_media_id', '',
    'bride_bank_name', '',
    'bride_account_name', w.bride_name,
    'bride_account_number', '',
    'bride_qr_media_id', ''
  ),
  false
from public.weddings w
on conflict (wedding_id, section_key) do update
set content = excluded.content || public.wedding_content.content,
    updated_at = now();

-- Remove obsolete independent ceremony dates. The wedding date is shared in
-- weddings.wedding_date; ceremony times remain per household in families.
update public.wedding_content
set content = content - 'groom_ceremony_date_text' - 'bride_ceremony_date_text' - 'ceremony_date_text',
    updated_at = now()
where section_key = 'families'
  and (content ? 'groom_ceremony_date_text' or content ? 'bride_ceremony_date_text' or content ? 'ceremony_date_text');

commit;

-- Inspect the section data without exposing account secrets outside the SQL editor.
select w.slug, c.section_key, c.is_published, c.content
from public.wedding_content c
join public.weddings w on w.id = c.wedding_id
where c.section_key in ('families', 'gifts')
order by w.slug, c.section_key;
