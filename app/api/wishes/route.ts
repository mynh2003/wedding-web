import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { readJson } from "@/lib/http/body";
import { parseWishInput } from "@/lib/validation/wish";
import { hashInvitationToken } from "@/lib/invitations/token";

export const dynamic = "force-dynamic";
const slug = process.env.NEXT_PUBLIC_WEDDING_SLUG ?? "binh-minh-ninh-hue";

export async function GET() {
  const supabase = await createClient();
  let { data, error } = await supabase.from("public_wishes").select("id, author_name, message, created_at, side").eq("wedding_slug", slug).order("created_at", { ascending: false }).limit(50);
  // Deployments predating the wish-sides migration can still read approved wishes.
  if (error?.code === "42703" && /column public_wishes\.side does not exist/.test(error.message)) {
    const legacy = await supabase.from("public_wishes").select("id, author_name, message, created_at").eq("wedding_slug", slug).order("created_at", { ascending: false }).limit(50);
    data = legacy.data?.map((wish) => ({ ...wish, side: null })) ?? null;
    error = legacy.error;
  }
  if (error) {
    console.error("[api/wishes] Failed to load public wishes", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return NextResponse.json({ error: "Không thể tải lời chúc." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  if ("error" in body) return NextResponse.json({ error: body.error }, { status: 400 });
  const parsed = parseWishInput(body.value);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const fingerprint = createHash("sha256").update(`${process.env.WISH_RATE_LIMIT_SECRET ?? process.env.NEXT_PUBLIC_SUPABASE_URL}:${forwarded}`).digest("hex");
  const supabase = await createClient();
  const { error } = parsed.value.invitationToken
    ? await supabase.rpc("submit_invitation_response", { input_token_hash: hashInvitationToken(parsed.value.invitationToken), input_author: parsed.value.authorName, input_message: parsed.value.message, input_attendance: parsed.value.attendance, input_fingerprint: fingerprint })
    : await supabase.rpc("submit_public_wish", { input_slug: slug, input_author: parsed.value.authorName, input_message: parsed.value.message, input_fingerprint: fingerprint, input_side: parsed.value.side ?? null });
  if (error) {
    const limited = error.message.includes("rate limited");
    return NextResponse.json({ error: limited ? "Bạn đã gửi quá nhiều lời chúc. Vui lòng thử lại sau." : "Không thể gửi lời chúc lúc này." }, { status: limited ? 429 : 400, headers: { "Retry-After": limited ? "600" : "0", "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ message: "Lời chúc đã được gửi thành công. Cảm ơn bạn đã gửi lời chúc đến chúng mình!" }, { status: 202, headers: { "Cache-Control": "no-store" } });
}
