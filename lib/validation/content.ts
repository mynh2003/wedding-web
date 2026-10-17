export type ContentInput = { sectionKey: string; content: Record<string, unknown>; isPublished: boolean };

const allowedKeys = new Set(["hero", "invitation", "venue", "story", "timeline", "dress_code"]);
function safeText(value: unknown, max: number) { return typeof value === "string" && value.length <= max ? value : null; }

export function parseContentInput(value: unknown): { value: ContentInput } | { error: string } {
  if (!value || typeof value !== "object") return { error: "Dữ liệu không hợp lệ." };
  const body = value as Record<string, unknown>;
  const sectionKey = typeof body.sectionKey === "string" ? body.sectionKey.trim() : "";
  if (!allowedKeys.has(sectionKey)) return { error: "Section không được phép." };
  if (!body.content || typeof body.content !== "object" || Array.isArray(body.content)) return { error: "Nội dung không hợp lệ." };
  const input = body.content as Record<string, unknown>;
  const content: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(input)) {
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(key)) return { error: "Tên trường không hợp lệ." };
    if (typeof raw === "string") { const text = safeText(raw, 2000); if (text === null) return { error: "Nội dung quá dài." }; content[key] = text; }
    else if (Array.isArray(raw) && raw.length <= 30 && raw.every((item) => typeof item === "string" && item.length <= 500)) content[key] = raw;
    else return { error: "Nội dung chỉ hỗ trợ text an toàn." };
  }
  return { value: { sectionKey, content, isPublished: body.isPublished === true } };
}

export const ALLOWED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/ogg"]);
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export function hasValidSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.slice(0, 8).every((v, i) => v === [137,80,78,71,13,10,26,10][i]);
  if (mime === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (mime === "audio/ogg") return new TextDecoder().decode(bytes.slice(0, 4)) === "OggS";
  if (mime === "audio/mpeg") return (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) || new TextDecoder().decode(bytes.slice(0, 3)) === "ID3";
  return false;
}
