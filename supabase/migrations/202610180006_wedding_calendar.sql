-- Calendar image and inclusive date range. Existing values and publish flags survive reruns.
begin;

insert into public.wedding_content (wedding_id, section_key, content, is_published)
select id, 'invitation', jsonb_build_object('calendar_banner_media_id', ''), false
from public.weddings
on conflict (wedding_id, section_key) do update
set content = excluded.content || public.wedding_content.content,
    updated_at = now();

insert into public.wedding_content (wedding_id, section_key, content, is_published)
select id, 'families', jsonb_build_object('calendar_start_date', '', 'calendar_end_date', ''), false
from public.weddings
on conflict (wedding_id, section_key) do update
set content = excluded.content || public.wedding_content.content,
    updated_at = now();

commit;
