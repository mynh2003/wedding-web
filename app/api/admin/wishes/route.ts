import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export async function GET() {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await context.supabase.from("wishes").select("id, author_name, message, status, created_at, reviewed_at, side, guest:guests!wishes_guest_id_fkey(deleted_at)").eq("wedding_id", context.admin.wedding_id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Unable to load wishes" }, { status: 500 });
  const wishes = (data ?? []).map(({ guest, ...wish }) => {
    const linkedGuest = Array.isArray(guest) ? guest[0] : guest;
    return { ...wish, guest_inactive: Boolean(linkedGuest?.deleted_at) };
  });
  return NextResponse.json({ data: wishes }, { headers: { "Cache-Control": "private, no-store" } });
}
