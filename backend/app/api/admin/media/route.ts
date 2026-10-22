import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdmin } from "@/lib/auth/admin";
import { ALLOWED_MEDIA, MAX_MEDIA_BYTES, MAX_MEDIA_LABEL, hasValidSignature } from "@/lib/validation/content";
import { getSignedMediaUrls } from "@/lib/media/signed-urls";
import { readBytes } from "@/lib/http/body";
import { optimizeUploadedImage } from "@/lib/media/optimize-image";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rawPage = request ? new URL(request.url).searchParams.get("page") : null;
  const page = rawPage === null ? 1 : Number(rawPage);
  if (!Number.isInteger(page) || page < 1 || page > 1000) return NextResponse.json({ error: "Trang không hợp lệ." }, { status: 400 });
  const pageSize = 24;
  const query = context.supabase.from("media_assets")
    .select("id, storage_path, mime_type, alt_text, is_public, created_at", { count: "exact" })
    .eq("wedding_id", context.admin.wedding_id).like("mime_type", "image/%")
    .order("created_at", { ascending: false }).order("id", { ascending: false });
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) return NextResponse.json({ error: "Unable to load media" }, { status: 500 });
  const imagePaths = (data ?? []).filter((item) => item.mime_type.startsWith("image/"))
    .map((item) => item.storage_path);
  const urls = await getSignedMediaUrls(context.supabase, imagePaths);
  const items = (data ?? []).map((item) => item.mime_type.startsWith("image/")
    ? { ...item, url: urls.get(item.storage_path) ?? null } : item);
  return NextResponse.json({ data: items, total: count ?? 0, page, pageSize }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const context = await getAdmin(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const length = Number(request.headers.get("content-length") ?? 0); if (length > MAX_MEDIA_BYTES + 1024 * 1024) return NextResponse.json({ error: `File vượt quá giới hạn ${MAX_MEDIA_LABEL}.` }, { status: 413 });
  let form: FormData;
  const body = await readBytes(request, MAX_MEDIA_BYTES + 64 * 1024);
  if ("error" in body) return NextResponse.json({ error: "Dữ liệu tải lên quá lớn hoặc không hợp lệ." }, { status: 413 });
  try { form = await new Response(body.value, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData(); }
  catch { return NextResponse.json({ error: "Dữ liệu tải lên không hợp lệ." }, { status: 400 }); }
  const file = form.get("file"); const altText = form.get("altText");
  if (!(file instanceof File) || !ALLOWED_MEDIA.has(file.type) || file.size < 1 || file.size > MAX_MEDIA_BYTES) return NextResponse.json({ error: `Chỉ nhận JPEG, PNG, WebP, MP3 hoặc OGG tối đa ${MAX_MEDIA_LABEL}.` }, { status: 400 });
  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer()); if (!hasValidSignature(bytes, file.type)) return NextResponse.json({ error: "Nội dung file không khớp MIME type." }, { status: 400 });
  let mimeType = file.type;
  if (file.type.startsWith("image/")) {
    try { bytes = await optimizeUploadedImage(bytes, file.type); mimeType = "image/webp"; }
    catch { return NextResponse.json({ error: "Ảnh không hợp lệ, vượt giới hạn 40 megapixel hoặc có chuyển động. Vui lòng chọn ảnh tĩnh nhỏ hơn." }, { status: 400 }); }
    if (bytes.byteLength > MAX_MEDIA_BYTES) return NextResponse.json({ error: `Ảnh sau xử lý vượt giới hạn ${MAX_MEDIA_LABEL}.` }, { status: 413 });
  }
  const extension = ({ "image/webp": "webp", "audio/mpeg": "mp3", "audio/ogg": "ogg" } as Record<string, string>)[mimeType];
  const storagePath = `${context.admin.wedding_id}/${randomUUID()}.${extension}`;
  const upload = await context.supabase.storage.from("wedding-private").upload(storagePath, bytes, { contentType: mimeType, upsert: false });
  if (upload.error) {
    const error = upload.error;
    const code = "code" in error && typeof error.code === "string" ? error.code : error.statusCode;
    const status = Number(error.statusCode) || error.status || 0;
    console.error("[api/admin/media] Storage upload failed", { code, status });
    let message = "Không thể lưu file. Vui lòng thử lại sau.";
    let responseStatus = 502;
    if (code === "NoSuchBucket" || /bucket.*not found/i.test(error.message)) {
      message = "Dịch vụ lưu ảnh chưa sẵn sàng. Vui lòng thử lại sau.";
      responseStatus = 503;
    } else if (status === 401 || status === 403 || code === "AccessDenied" || /row.level security|unauthorized|permission denied/i.test(error.message)) {
      message = "Không có quyền lưu ảnh. Vui lòng đăng nhập lại.";
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
  const { data, error } = await context.supabase.from("media_assets").insert({ wedding_id: context.admin.wedding_id, storage_path: storagePath, mime_type: mimeType, alt_text: cleanAlt, is_public: false }).select("id, storage_path, mime_type, alt_text, is_public, created_at").single();
  if (error) {
    console.error("[api/admin/media] Metadata insert failed", { code: error.code });
    const cleanup = await context.supabase.storage.from("wedding-private").remove([storagePath]);
    if (cleanup.error) console.error("[api/admin/media] Upload cleanup failed", { code: cleanup.error.name });
    return NextResponse.json({ error: "Không thể lưu metadata file." }, { status: 500 });
  }
  return NextResponse.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
