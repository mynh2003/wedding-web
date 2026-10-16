import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { readJson } from "@/lib/http/body";
import { parseGuestPatch } from "@/lib/validation/guest";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsedBody = await readJson(request);
  if ("error" in parsedBody) return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  const parsed = parseGuestPatch(parsedBody.value);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const update: Record<string, unknown> = { ...parsed.value };
  if (parsed.value.guestGroup) {
    const { data: group } = await context.supabase.from("guest_groups").select("id").eq("wedding_id", context.admin.wedding_id).eq("name", parsed.value.guestGroup).single();
    if (!group) return NextResponse.json({ error: "Guest group is not configured" }, { status: 400 });
    update.guest_group_id = group.id;
  }
  delete update.guestGroup;
  const { data, error } = await context.supabase.from("guests").update(update).eq("id", id).eq("wedding_id", context.admin.wedding_id).select("id, display_name, guest_group_id, created_at").single();
  if (error || !data) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await context.supabase.from("guests").delete().eq("id", id).eq("wedding_id", context.admin.wedding_id);
  if (error) return NextResponse.json({ error: "Unable to delete guest" }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
