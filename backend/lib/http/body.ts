import "server-only";

type BodyResult<T> = { value: T } | { error: string };

export async function readBytes(request: Request, maxBytes: number): Promise<BodyResult<Uint8Array<ArrayBuffer>>> {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) return { error: "Payload too large" as const };
  if (!request.body) return { value: new Uint8Array(0) };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => undefined);
        return { error: "Payload too large" as const };
      }
      chunks.push(value);
    }
  } catch {
    return { error: "Invalid request body" as const };
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return { value: bytes };
}

export async function readText(request: Request, maxBytes = 10_000): Promise<BodyResult<string>> {
  const result = await readBytes(request, maxBytes);
  if ("error" in result) return result;
  try { return { value: new TextDecoder("utf-8", { fatal: true }).decode(result.value) }; }
  catch { return { error: "Invalid request body" as const }; }
}

export async function readJson(request: Request, maxBytes = 10_000): Promise<BodyResult<unknown>> {
  const raw = await readText(request, maxBytes);
  if ("error" in raw) return raw;
  try { return { value: JSON.parse(raw.value) as unknown }; } catch { return { error: "Invalid JSON" as const }; }
}
