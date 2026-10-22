import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthOrigin, hasTrustedOrigin } from "@/lib/auth/origin";
import { readText } from "@/lib/http/body";
import { limitRequest } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.redirect(new URL("/admin/login?error=forbidden", getAuthOrigin(request)), 303);
  const invalid = () => NextResponse.redirect(new URL("/admin/login?error=invalid", getAuthOrigin(request)), 303);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return invalid();
  const body = await readText(request, 4096);
  if ("error" in body) return invalid();
  const form = new URLSearchParams(body.value);
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password || email.length > 254 || password.length > 256) return NextResponse.redirect(new URL("/admin/login?error=invalid", getAuthOrigin(request)), 303);

  const limited = await limitRequest(request, "login-ip") ?? await limitRequest(request, "login-account", email);
  if (limited) {
    const response = NextResponse.redirect(new URL(`/admin/login?error=${limited.status === 429 ? "limited" : "unavailable"}`, getAuthOrigin(request)), 303);
    response.headers.set("Retry-After", limited.headers.get("Retry-After") ?? "60");
    return response;
  }

  try {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.redirect(new URL("/admin/login?error=invalid", getAuthOrigin(request)), 303);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return invalid();
  }
  const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return invalid();
  }
  return NextResponse.redirect(new URL("/admin", getAuthOrigin(request)), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/login?error=unavailable", getAuthOrigin(request)), 303);
  }
}
