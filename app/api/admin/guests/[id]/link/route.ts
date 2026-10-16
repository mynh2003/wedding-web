import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { createInvitationToken } from "@/lib/invitations/token";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data: guest } = await context.supabase.from("guests").select("id").eq("id", id).eq("wedding_id", context.admin.wedding_id).single();
  if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  const { rawToken, tokenHash } = createInvitationToken();
  const { error: revokeError } = await context.supabase.from("invitation_links").update({ revoked_at: new Date().toISOString() }).eq("guest_id", id).eq("wedding_id", context.admin.wedding_id).is("revoked_at", null);
  if (revokeError) return NextResponse.json({ error: "Unable to revoke previous link" }, { status: 500 });
  const { error } = await context.supabase.from("invitation_links").insert({ wedding_id: context.admin.wedding_id, guest_id: id, token_hash: tokenHash });
  if (error) return NextResponse.json({ error: "Unable to create invitation link" }, { status: 500 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  return NextResponse.json({ invitationUrl: `${siteUrl.replace(/\/$/, "")}/i/${rawToken}` }, { headers: { "Cache-Control": "no-store" } });
}
