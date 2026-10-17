import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/auth/origin";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.redirect(new URL("/admin/login?error=forbidden", request.url), 303);
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password || email.length > 254 || password.length > 256) return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=unconfirmed", request.url), 303);
  }
  const { data: admin } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  if (!admin) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=not-admin", request.url), 303);
  }
  return NextResponse.redirect(new URL("/admin", request.url));
}
