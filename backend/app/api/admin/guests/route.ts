import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { readJson } from "@/lib/http/body";
import { createInvitationToken } from "@/lib/invitations/token";
import { encryptInvitationToken } from "@/lib/invitations/storage";
import { randomUUID } from "node:crypto";
import { parseGuestInput } from "@/lib/validation/guest";
import { getInvitationOrigin } from "@/lib/invitation-origin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("pageSize") ?? "20") || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const search = (request.nextUrl.searchParams.get("search") ?? "").trim().slice(0, 160);
  const trashed = request.nextUrl.searchParams.get("view") === "trash";
  let query = context.supabase.from("guests").select("id, display_name, guest_group_id, attendance_status, created_at, deleted_at", { count: "exact" }).eq("wedding_id", context.admin.wedding_id);
  query = trashed ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
  if (search) query = query.ilike("display_name", `%${search.replace(/[\\%_]/g, "\\$&")}%`);
  const { data, count, error } = await query.order(trashed ? "deleted_at" : "created_at", { ascending: false }).range(from, to);
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

  const guestId = randomUUID();
  const { rawToken, tokenHash } = createInvitationToken();
  let tokenEncrypted: string;
  try { tokenEncrypted = encryptInvitationToken(rawToken, context.admin.wedding_id, guestId); }
  catch { return NextResponse.json({ error: "Chưa cấu hình khóa lưu link thiệp trên máy chủ." }, { status: 503 }); }

  const { data: group, error: groupError } = await context.supabase.from("guest_groups").select("id").eq("wedding_id", context.admin.wedding_id).eq("name", parsed.value.guestGroup).single();
  if (groupError || !group) return NextResponse.json({ error: "Guest group is not configured" }, { status: 400 });
  const { data: guest, error: guestError } = await context.supabase.from("guests").insert({ id: guestId, wedding_id: context.admin.wedding_id, guest_group_id: group.id, display_name: parsed.value.displayName }).select("id, display_name, guest_group_id, attendance_status, created_at").single();
  if (guestError || !guest) return NextResponse.json({ error: "Unable to create guest" }, { status: 500 });

  const { error: linkError } = await context.supabase.from("invitation_links").insert({ wedding_id: context.admin.wedding_id, guest_id: guest.id, token_hash: tokenHash, token_encrypted: tokenEncrypted });
  if (linkError) {
    await context.supabase.from("guests").delete().eq("id", guest.id).eq("wedding_id", context.admin.wedding_id);
    return NextResponse.json({ error: "Unable to create invitation link" }, { status: 500 });
  }
  const siteUrl = getInvitationOrigin(`${request.nextUrl.protocol}//${request.headers.get("host") ?? request.nextUrl.host}`, process.env.NEXT_PUBLIC_SITE_URL, process.env.NODE_ENV === "development");
  return NextResponse.json({ data: guest, invitationUrl: `${siteUrl.replace(/\/$/, "")}/i/${rawToken}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
