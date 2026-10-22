import { readJson } from "@/lib/http/body";
import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
import { hasTrustedOrigin } from "@/lib/auth/origin";
export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const context = await getAdmin(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const input = await readJson(request, 10000); if ("error" in input) return NextResponse.json({ error: "Dữ liệu không hợp lệ hoặc quá lớn." }, { status: 400 }); const body = input.value as { isPublic?: boolean; altText?: string } | null; if (!body || typeof body.isPublic !== "boolean" || (body.altText !== undefined && (typeof body.altText !== "string" || body.altText.length > 300))) return NextResponse.json({ error: "Dữ liệu không hợp lệ." }, { status: 400 }); const { id } = await params; const { data, error } = await context.supabase.from("media_assets").update({ is_public: body.isPublic, alt_text: body.altText?.trim() ?? null }).eq("id", id).eq("wedding_id", context.admin.wedding_id).select("id, storage_path, mime_type, alt_text, is_public, created_at").single(); if (error || !data) return NextResponse.json({ error: "Không thể cập nhật media." }, { status: 500 }); revalidatePath("/"); return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } }); }
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
  const context = await getAdmin();
  if (!context) return fail("Unauthorized", 401);
  if (!hasTrustedOrigin(request)) return fail("Yêu cầu không hợp lệ. Vui lòng tải lại trang.", 403);
  const input = await readJson(request, 1024);
  if ("error" in input || !input.value || typeof input.value !== "object" || !("confirmed" in input.value) || input.value.confirmed !== true) return fail("Vui lòng xác nhận xóa vĩnh viễn ảnh.", 400);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Không tìm thấy ảnh.", 404);

  // The database claims the file and serializes against content assignments.
  // Keep metadata when Storage fails, so a retry can finish instead of orphaning.
  const claimed = await context.supabase.rpc("begin_media_deletion", { input_id: id });
  if (claimed.error) {
    if (claimed.error.code === "23514") return fail("Ảnh còn được sử dụng hoặc có tham chiếu khác. Hãy thay/gỡ ảnh trước khi xóa.", 409);
    if (claimed.error.code === "42501" || claimed.error.code === "P0002") return fail("Không tìm thấy ảnh có thể xóa.", 404);
    return fail("Chức năng xóa ảnh chưa sẵn sàng. Vui lòng thử lại sau.", 503);
  }
  const storagePath = claimed.data;
  if (typeof storagePath !== "string" || !storagePath.startsWith(`${context.admin.wedding_id}/`)) return fail("Không thể xác nhận ảnh cần xóa.", 500);
  const removed = await context.supabase.storage.from("wedding-private").remove([storagePath]);
  if (removed.error) return fail("Chưa xóa xong tệp ảnh. Ảnh được giữ trong thư viện để bạn thử lại.", 502);
  const completed = await context.supabase.rpc("complete_media_deletion", { input_id: id });
  if (completed.error || completed.data !== true) return fail("Chưa hoàn tất xóa ảnh. Vui lòng thử lại để hoàn thành.", 503);
  revalidatePath("/admin/content");
  return NextResponse.json({ ok: true }, { headers });
}
