import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const slug = process.env.NEXT_PUBLIC_WEDDING_SLUG ?? "binh-minh-ninh-hue";
  const { data: wedding } = await supabase.from("weddings").select("id").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!wedding) return NextResponse.json({ data: [] }, { headers: { "Cache-Control": "no-store" } });
  const { data, error } = await supabase.from("wedding_content").select("section_key, content, updated_at").eq("wedding_id", wedding.id).eq("is_published", true).order("section_key");
  if (error) return NextResponse.json({ error: "Không thể tải nội dung." }, { status: 500 });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}
