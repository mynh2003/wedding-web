-- Two shared dates; household-specific meal times; one shared groom ceremony.
-- Do not infer meal dates/times or lunar dates from the old highlight range.
begin;

insert into public.wedding_content (wedding_id, section_key, content, is_published)
select id, 'families', '{}'::jsonb, false from public.weddings
on conflict (wedding_id, section_key) do nothing;

update public.wedding_content
set content = (
  jsonb_build_object(
    'meal_date', '',
    'meal_lunar_date_text', '',
    'groom_meal_time', '',
    'bride_meal_time', ''
  ) || content
) - 'bride_ceremony_name' - 'bride_ceremony_time'
  - 'bride_ceremony_date_text' - 'groom_ceremony_name',
  updated_at = now()
where section_key = 'families';

commit;
