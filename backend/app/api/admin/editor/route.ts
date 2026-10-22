import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { getSignedMediaUrls } from "@/lib/media/signed-urls";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { supabase, admin } = context;
  const [content, wedding] = await Promise.all([
    supabase.from("wedding_content").select("section_key, content, is_published, updated_at").eq("wedding_id", admin.wedding_id).order("section_key"),
    supabase.from("weddings").select("groom_name, bride_name, wedding_date").eq("id", admin.wedding_id).single(),
  ]);
  if (content.error || wedding.error || !wedding.data) return NextResponse.json({ error: "Không thể tải nội dung quản trị." }, { status: 500, headers });
  const ids = [...new Set((content.data ?? []).flatMap(row => Object.values(row.content ?? {}).flatMap(value => Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value)))];
  const media = ids.length ? await supabase.from("media_assets")
    .select("id, storage_path, mime_type, alt_text, is_public, created_at").eq("wedding_id", admin.wedding_id).in("id", ids)
    : { data: [], error: null };
  if (media.error) return NextResponse.json({ error: "Không thể tải ảnh quản trị." }, { status: 500, headers });
  // Sign only images attached to the editor. The library loads 24 previews/page.
  const urls = await getSignedMediaUrls(supabase, (media.data ?? []).filter(item => item.mime_type.startsWith("image/")).map(item => item.storage_path));
  return NextResponse.json({
    data: content.data ?? [], wedding: wedding.data,
    media: (media.data ?? []).map(item => ({ ...item, url: urls.get(item.storage_path) ?? null })),
  }, { headers });
}
