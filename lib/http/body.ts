import "server-only";

export async function readJson(request: Request, maxBytes = 10_000) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) return { error: "Payload too large" as const };
  try { return { value: JSON.parse(raw) as unknown }; } catch { return { error: "Invalid JSON" as const }; }
}
