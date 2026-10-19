-- Run after schema migrations and creating the wedding.
-- Change this slug if initializing a different wedding.
insert into public.wedding_content (wedding_id, section_key, content, is_published)
select id, 'dress_code', '{"colors":["#eee5d5","#cbb798","#826653","#642b36","#9ca88c"]}'::jsonb, true
from public.weddings
where slug = 'binh-minh-ninh-hue'
on conflict (wedding_id, section_key) do update
set content = public.wedding_content.content || excluded.content,
    is_published = true,
    updated_at = now();
