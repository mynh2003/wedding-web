import { NextResponse } from "next/server";
import { readJson } from "@/lib/http/body";
import { createPublicClient } from "@/lib/supabase/public-server";
import type { ResolvedInvitation } from "@/lib/wedding-types";
import { limitRequest } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const notFound = () => NextResponse.json({ error: "Không tìm thấy thiệp mời." }, { status: 404, headers });

export async function POST(request: Request) {
  try {
    const body = await readJson(request, 1024);
    if ("error" in body || !body.value || typeof body.value !== "object" || !("tokenHash" in body.value)) return notFound();
    const { tokenHash } = body.value;
    if (typeof tokenHash !== "string" || !/^[a-f0-9]{64}$/.test(tokenHash)) return notFound();
    const limited = await limitRequest(request, "invitation");
    if (limited) return limited;

    const { data, error } = await createPublicClient()
      .rpc("resolve_invitation_token", { input_token_hash: tokenHash }).maybeSingle() as { data: ResolvedInvitation | null; error: unknown };
    if (error || !data || typeof data.guest_name !== "string" || typeof data.wedding_slug !== "string"
      || (data.guest_group !== "groom" && data.guest_group !== "bride")) return notFound();
    return NextResponse.json({ data: { guest_name: data.guest_name, wedding_slug: data.wedding_slug, guest_group: data.guest_group } }, { headers });
  } catch {
    return notFound();
  }
}
