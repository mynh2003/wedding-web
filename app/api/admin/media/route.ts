import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdmin } from "@/lib/auth/admin";
import { ALLOWED_MEDIA, MAX_MEDIA_BYTES, hasValidSignature } from "@/lib/validation/content";
export const dynamic = "force-dynamic";

export async function GET() { const context = await getAdmin(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { data, error } = await context.supabase.from("media_assets").select("id, storage_path, mime_type, alt_text, is_public, created_at").eq("wedding_id", context.admin.wedding_id).order("created_at", { ascending: false }); if (error) return NextResponse.json({ error: "Unable to load media" }, { status: 500 }); const items = await Promise.all((data ?? []).map(async (item) => { if (!item.mime_type.startsWith("image/")) return item; const signed = await context.supabase.storage.from("wedding-private").createSignedUrl(item.storage_path, 3600); return { ...item, url: signed.data?.signedUrl ?? null }; })); return NextResponse.json({ data: items }, { headers: { "Cache-Control": "private, no-store" } }); }

export async function POST(request: NextRequest) {
  const context = await getAdmin(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const length = Number(request.headers.get("content-length") ?? 0); if (length > MAX_MEDIA_BYTES + 1024 * 1024) return NextResponse.json({ error: "File vượt quá giới hạn 10MB." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Dữ liệu tải lên không hợp lệ." }, { status: 400 }); }
  const file = form.get("file"); const altText = form.get("altText");
  if (!(file instanceof File) || !ALLOWED_MEDIA.has(file.type) || file.size < 1 || file.size > MAX_MEDIA_BYTES) return NextResponse.json({ error: "Chỉ nhận JPEG, PNG, WebP, MP3 hoặc OGG tối đa 10MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer()); if (!hasValidSignature(bytes, file.type)) return NextResponse.json({ error: "Nội dung file không khớp MIME type." }, { status: 400 });
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/mpeg": "mp3", "audio/ogg": "ogg" } as Record<string, string>)[file.type];
  const storagePath = `${context.admin.wedding_id}/${randomUUID()}.${extension}`;
  const upload = await context.supabase.storage.from("wedding-private").upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (upload.error) {
    const error = upload.error;
    const code = "code" in error && typeof error.code === "string" ? error.code : error.statusCode;
    const status = Number(error.statusCode) || error.status || 0;
    console.error("[api/admin/media] Storage upload failed", { name: error.name, code, status, message: error.message });
    let message = "Không thể lưu file. Vui lòng thử lại sau.";
    let responseStatus = 502;
    if (code === "NoSuchBucket" || /bucket.*not found/i.test(error.message)) {
      message = "Storage chưa được cấu hình: thiếu bucket wedding-private. Vui lòng chạy migration 202610180005_repair_media_storage.sql trong Supabase SQL Editor.";
      responseStatus = 503;
    } else if (status === 401 || status === 403 || code === "AccessDenied" || /row.level security|unauthorized|permission denied/i.test(error.message)) {
      message = "Không có quyền lưu file vào Storage. Vui lòng đăng nhập lại; nếu vẫn lỗi, chạy migration 202610180005_repair_media_storage.sql trong Supabase SQL Editor.";
      responseStatus = 403;
    } else if (status === 413 || code === "EntityTooLarge") {
      message = "File vượt quá giới hạn dung lượng của Storage (tối đa 10MB).";
      responseStatus = 413;
    } else if (status === 429 || code === "TooManyRequests") {
      message = "Storage đang nhận quá nhiều yêu cầu. Vui lòng thử lại sau.";
      responseStatus = 429;
    }
    return NextResponse.json({ error: message }, { status: responseStatus, headers: { "Cache-Control": "no-store" } });
  }
  const cleanAlt = typeof altText === "string" ? altText.trim().slice(0, 300) : null;
  const { data, error } = await context.supabase.from("media_assets").insert({ wedding_id: context.admin.wedding_id, storage_path: storagePath, mime_type: file.type, alt_text: cleanAlt, is_public: false }).select("id, storage_path, mime_type, alt_text, is_public, created_at").single();
  if (error) {
    console.error("[api/admin/media] Metadata insert failed", { code: error.code, message: error.message });
    const cleanup = await context.supabase.storage.from("wedding-private").remove([storagePath]);
    if (cleanup.error) console.error("[api/admin/media] Upload cleanup failed", { message: cleanup.error.message });
    return NextResponse.json({ error: "Không thể lưu metadata file." }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
