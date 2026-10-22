import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { confirmGuestAction } from "@/lib/auth/confirm-guest-action";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdmin();
  const headers = { "Cache-Control": "private, no-store" };
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { id } = await params;
  const confirmationError = await confirmGuestAction(request, context, id, "restore-guest");
  if (confirmationError) return confirmationError;
  const { error } = await context.supabase.rpc("manage_guest_lifecycle", { target_guest_id: id, input_action: "restore" });
  if (error) return NextResponse.json({ error: "Không thể khôi phục khách. Vui lòng tải lại danh sách và thử lại." }, { status: error.code === "P0002" ? 404 : error.code === "23514" ? 409 : 500, headers });
  return new NextResponse(null, { status: 204, headers });
}
