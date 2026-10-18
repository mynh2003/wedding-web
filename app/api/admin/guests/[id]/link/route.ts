import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { createInvitationToken, hashInvitationToken } from "@/lib/invitations/token";
import { decryptInvitationToken, encryptInvitationToken } from "@/lib/invitations/storage";
import { confirmGuestAction } from "@/lib/auth/confirm-guest-action";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { id } = await params;
  const { data: guest, error: guestError } = await context.supabase.from("guests").select("id").eq("id", id).eq("wedding_id", context.admin.wedding_id).is("deleted_at", null).maybeSingle();
  if (guestError) return NextResponse.json({ error: "Không thể tải thông tin khách mời." }, { status: 500, headers });
  if (!guest) return NextResponse.json({ error: "Không tìm thấy khách mời." }, { status: 404, headers });
  const { data: link, error } = await context.supabase.from("invitation_links").select("token_hash, token_encrypted").eq("guest_id", id).eq("wedding_id", context.admin.wedding_id).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: "Không thể tải link thiệp. Kiểm tra migration lưu link đã được áp dụng." }, { status: 500, headers });
  if (!link) return NextResponse.json({ error: "Khách này chưa có link đang hoạt động. Bạn có thể tạo link mới." }, { status: 404, headers });
  if (!link.token_encrypted) return NextResponse.json({ error: "Link này được tạo trước khi có tính năng lưu link nên không thể mở lại. Link cũ vẫn hoạt động. Chỉ tạo lại nếu bạn muốn thay thế link cũ.", code: "legacy_link" }, { status: 409, headers });
  try {
    const token = decryptInvitationToken(link.token_encrypted, context.admin.wedding_id, id);
    if (hashInvitationToken(token) !== link.token_hash) throw new Error();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
    return NextResponse.json({ invitationUrl: `${siteUrl.replace(/\/$/, "")}/i/${token}` }, { headers });
  } catch {
    return NextResponse.json({ error: "Không thể giải mã link đã lưu. Kiểm tra khóa mã hóa trên máy chủ; link cũ vẫn hoạt động." }, { status: 503, headers });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { id } = await params;
  const confirmationError = await confirmGuestAction(request, context, id, "regenerate-link");
  if (confirmationError) return confirmationError;
  const { data: guest } = await context.supabase.from("guests").select("id").eq("id", id).eq("wedding_id", context.admin.wedding_id).is("deleted_at", null).single();
  if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404, headers });
  const { rawToken, tokenHash } = createInvitationToken();
  let tokenEncrypted: string;
  try { tokenEncrypted = encryptInvitationToken(rawToken, context.admin.wedding_id, id); }
  catch { return NextResponse.json({ error: "Chưa cấu hình khóa lưu link thiệp trên máy chủ." }, { status: 503, headers }); }
  // The database transaction sets revoked_at and inserts the replacement together.
  const { error } = await context.supabase.rpc("replace_invitation_link", { target_guest_id: id, new_token_hash: tokenHash, new_token_encrypted: tokenEncrypted });
  if (error) return NextResponse.json({ error: "Không thể tạo lại link. Link cũ vẫn được giữ nguyên." }, { status: 500, headers });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  return NextResponse.json({ invitationUrl: `${siteUrl.replace(/\/$/, "")}/i/${rawToken}` }, { headers });
}
