import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public-server";
import { getSignedMediaUrls } from "@/lib/media/signed-urls";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const supabase = createPublicClient();
    const slug = process.env.NEXT_PUBLIC_WEDDING_SLUG ?? "binh-minh-ninh-hue";
    const { data: wedding, error: weddingError } = await supabase.from("weddings")
      .select("id").eq("slug", slug).eq("is_published", true).maybeSingle();
    if (weddingError) throw weddingError;
    if (!wedding) return NextResponse.json({ data: [] }, { headers });

    const { data, error } = await supabase.from("media_assets")
      .select("id,storage_path,mime_type,alt_text,created_at")
      .eq("wedding_id", wedding.id).eq("is_public", true)
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw error;

    const urls = await getSignedMediaUrls(supabase, (data ?? []).map((item) => item.storage_path));
    const items = (data ?? []).flatMap((item) => {
      const url = urls.get(item.storage_path);
      return url ? [{ id: item.id, url, mime_type: item.mime_type, alt_text: item.alt_text, created_at: item.created_at }] : [];
    });
    return NextResponse.json({ data: items }, { headers });
  } catch {
    return NextResponse.json({ error: "Không thể tải media." }, { status: 500, headers });
  }
}
