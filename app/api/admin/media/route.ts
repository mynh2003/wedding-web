import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdmin } from "@/lib/auth/admin";
import { ALLOWED_MEDIA, MAX_MEDIA_BYTES, hasValidSignature } from "@/lib/validation/content";
export const dynamic = "force-dynamic";

export async function GET() { const context = await getAdmin(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { data, error } = await context.supabase.from("media_assets").select("id, storage_path, mime_type, alt_text, is_public, created_at").eq("wedding_id", context.admin.wedding_id).order("created_at", { ascending: false }); if (error) return NextResponse.json({ error: "Unable to load media" }, { status: 500 }); return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } }); }

export async function POST(request: NextRequest) {
  const context = await getAdmin(); if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const length = Number(request.headers.get("content-length") ?? 0); if (length > MAX_MEDIA_BYTES + 1024 * 1024) return NextResponse.json({ error: "File vượt quá giới hạn 10MB." }, { status: 413 });
  const form = await request.formData(); const file = form.get("file"); const altText = form.get("altText");
  if (!(file instanceof File) || !ALLOWED_MEDIA.has(file.type) || file.size < 1 || file.size > MAX_MEDIA_BYTES) return NextResponse.json({ error: "Chỉ nhận JPEG, PNG, WebP, MP3 hoặc OGG tối đa 10MB." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer()); if (!hasValidSignature(bytes, file.type)) return NextResponse.json({ error: "Nội dung file không khớp MIME type." }, { status: 400 });
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/mpeg": "mp3", "audio/ogg": "ogg" } as Record<string, string>)[file.type];
  const storagePath = `${context.admin.wedding_id}/${randomUUID()}.${extension}`;
  const upload = await context.supabase.storage.from("wedding-private").upload(storagePath, bytes, { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: "Không thể lưu file." }, { status: 500 });
  const cleanAlt = typeof altText === "string" ? altText.trim().slice(0, 300) : null;
  const { data, error } = await context.supabase.from("media_assets").insert({ wedding_id: context.admin.wedding_id, storage_path: storagePath, mime_type: file.type, alt_text: cleanAlt, is_public: false }).select("id, storage_path, mime_type, alt_text, is_public, created_at").single();
  if (error) { await context.supabase.storage.from("wedding-private").remove([storagePath]); return NextResponse.json({ error: "Không thể lưu metadata file." }, { status: 500 }); }
  return NextResponse.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
