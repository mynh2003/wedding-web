import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public-server";

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

    const { data, error } = await supabase.from("wedding_content")
      .select("section_key,content,updated_at").eq("wedding_id", wedding.id)
      .eq("is_published", true).order("section_key");
    if (error) throw error;
    return NextResponse.json({ data: data ?? [] }, { headers });
  } catch {
    return NextResponse.json({ error: "Không thể tải nội dung." }, { status: 500, headers });
  }
}
