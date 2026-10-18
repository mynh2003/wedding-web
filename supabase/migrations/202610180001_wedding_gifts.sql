-- Run in Supabase SQL Editor after 202610160001_phase3_foundation.sql.
-- Initializes gift settings for existing weddings; safe to run again.
-- Existing settings are preserved. Fill in real bank details in Admin > gifts.
begin;

insert into public.wedding_content (wedding_id, section_key, content, is_published)
select
  w.id,
  'gifts',
  jsonb_build_object(
    'bride_banner_url', '/placeholders/ring-wide.svg',
    'bride_qr_url', '',
    'bride_bank_name', '',
    'bride_account_name', w.bride_name,
    'bride_account_number', '',
    'groom_banner_url', '/placeholders/ring-wide.svg',
    'groom_qr_url', '',
    'groom_bank_name', '',
    'groom_account_name', w.groom_name,
    'groom_account_number', ''
  ),
  false
from public.weddings w
on conflict (wedding_id, section_key) do nothing;

commit;

-- Verify initialized settings (including unpublished drafts).
select w.slug, c.content, c.is_published
from public.wedding_content c
join public.weddings w on w.id = c.wedding_id
where c.section_key = 'gifts';
