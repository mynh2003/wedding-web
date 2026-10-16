import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasTrustedOrigin } from "@/lib/auth/origin";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password || email.length > 254 || password.length > 256) return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url));
  return NextResponse.redirect(new URL("/admin", request.url));
}
