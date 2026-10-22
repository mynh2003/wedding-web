import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthOrigin, hasTrustedOrigin } from "@/lib/auth/origin";

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return new NextResponse("Forbidden", { status: 403 });
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/admin/login", getAuthOrigin(request)), 303);
}
