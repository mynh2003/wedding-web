import "server-only";

import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { getAdmin } from "@/lib/auth/admin";
import { hasTrustedOrigin } from "@/lib/auth/origin";
import { readJson } from "@/lib/http/body";
import { limitRequest } from "@/lib/security/rate-limit";

export async function confirmGuestAction(
  request: NextRequest,
  context: NonNullable<Awaited<ReturnType<typeof getAdmin>>>,
  guestId: string,
  action: "delete-guest" | "hard-delete-guest" | "restore-guest" | "regenerate-link",
) {
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
  if (!hasTrustedOrigin(request)) return fail("Yêu cầu xác thực không hợp lệ. Vui lòng tải lại trang.", 403);
  const body = await readJson(request);
  if ("error" in body) return fail("Dữ liệu xác nhận không hợp lệ.", 400);
  const value = body.value as Record<string, unknown> | null;
  if (!value || value.confirmed !== true || value.action !== action || value.guestId !== guestId) {
    return fail("Vui lòng xác nhận đúng khách mời và thao tác trước khi tiếp tục.", 400);
  }
  if (typeof value.password !== "string" || !value.password || value.password.length > 256) {
    return fail("Vui lòng nhập lại mật khẩu quản trị để xác thực.", 400);
  }
  if (!context.user.email) return fail("Không thể xác thực tài khoản quản trị.", 403);
  const limited = await limitRequest(request, "reauth", context.user.id);
  if (limited) return limited;

  // Verify credentials in an isolated client; never replace the admin's cookies.
  const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const { data, error } = await verifier.auth.signInWithPassword({ email: context.user.email, password: value.password });
    if (error?.status === 429) return fail("Bạn đã thử xác thực quá nhiều lần. Vui lòng thử lại sau.", 429);
    if (error || data.user?.id !== context.user.id || !data.user?.email_confirmed_at) {
      return fail("Mật khẩu không đúng hoặc không thể xác thực. Chưa thực hiện thay đổi.", 403);
    }
    return null;
  } catch {
    return fail("Không thể kết nối để xác thực. Chưa thực hiện thay đổi.", 503);
  } finally {
    // Revoke only the temporary verification session, not other admin sessions.
    await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}
