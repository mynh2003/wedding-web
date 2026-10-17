import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export async function GET() {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await context.supabase.from("wishes").select("id, author_name, message, status, created_at, reviewed_at").eq("wedding_id", context.admin.wedding_id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Unable to load wishes" }, { status: 500 });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
}
