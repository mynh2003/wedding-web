import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { readJson } from "@/lib/http/body";
import { createInvitationToken } from "@/lib/invitations/token";
import { parseGuestInput } from "@/lib/validation/guest";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? "20") || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await context.supabase.from("guests").select("id, display_name, guest_group_id, created_at", { count: "exact" }).eq("wedding_id", context.admin.wedding_id).order("created_at", { ascending: false }).range(from, to);
  if (error) return NextResponse.json({ error: "Unable to load guests" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ data, page, pageSize, total: count ?? 0 }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsedBody = await readJson(request);
  if ("error" in parsedBody) return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  const parsed = parseGuestInput(parsedBody.value);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data: group, error: groupError } = await context.supabase.from("guest_groups").select("id").eq("wedding_id", context.admin.wedding_id).eq("name", parsed.value.guestGroup).single();
  if (groupError || !group) return NextResponse.json({ error: "Guest group is not configured" }, { status: 400 });
  const { data: guest, error: guestError } = await context.supabase.from("guests").insert({ wedding_id: context.admin.wedding_id, guest_group_id: group.id, display_name: parsed.value.displayName }).select("id, display_name, guest_group_id, created_at").single();
  if (guestError || !guest) return NextResponse.json({ error: "Unable to create guest" }, { status: 500 });

  const { rawToken, tokenHash } = createInvitationToken();
  const { error: linkError } = await context.supabase.from("invitation_links").insert({ wedding_id: context.admin.wedding_id, guest_id: guest.id, token_hash: tokenHash });
  if (linkError) {
    await context.supabase.from("guests").delete().eq("id", guest.id).eq("wedding_id", context.admin.wedding_id);
    return NextResponse.json({ error: "Unable to create invitation link" }, { status: 500 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  return NextResponse.json({ data: guest, invitationUrl: `${siteUrl.replace(/\/$/, "")}/i/${rawToken}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
