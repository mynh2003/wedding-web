-- Upgrade existing weddings; retain custom colors, other content and publish flags.
begin;
insert into public.wedding_content (wedding_id, section_key, content, is_published)
select id, 'dress_code', '{"colors":["#eee5d5","#cbb798","#826653","#642b36","#9ca88c"]}'::jsonb, true
from public.weddings
on conflict (wedding_id, section_key) do update
set content = excluded.content || public.wedding_content.content,
    updated_at = now();
commit;
