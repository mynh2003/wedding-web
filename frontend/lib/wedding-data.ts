import "server-only";

import { cache } from "react";
import type { PublicWedding, ResolvedInvitation } from "@/lib/wedding-types";
import { buildWeddingPresentation, type WeddingPresentation } from "@/lib/wedding-presentation";
import { serverRequest } from "@/lib/http/server-request.mjs";

type WeddingResponse = {
  data: PublicWedding | null;
  presentation: WeddingPresentation;
};

function backendOrigin() {
  const origin = process.env.BACKEND_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!origin) throw new Error("Set BACKEND_INTERNAL_URL or NEXT_PUBLIC_API_URL for frontend server requests.");
  return origin.replace(/\/$/, "");
}

async function readPublicResponse<T>(path: string, init?: RequestInit): Promise<T | null> {
  const headers = new Headers(init?.headers);
  // Preserve the canonical backend host when the services communicate through
  // an internal HTTP address behind the public HTTPS proxy.
  if (process.env.BACKEND_INTERNAL_URL && process.env.NEXT_PUBLIC_API_URL) {
    headers.set("Host", new URL(process.env.NEXT_PUBLIC_API_URL).host);
  }
  const url = `${backendOrigin()}${path}`;
  const signal = AbortSignal.timeout(15_000);
  const response = process.env.BACKEND_INTERNAL_URL
    ? await serverRequest(url, { method: init?.method, body: typeof init?.body === "string" ? init.body : undefined, headers, signal })
    : await fetch(url, { ...init, headers, cache: "no-store", credentials: "omit", signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Backend public data unavailable (${response.status}).`);
  return await response.json() as T;
}

async function readPublicData<T>(path: string, init?: RequestInit): Promise<T | null> {
  const result = await readPublicResponse<{ data: T | null }>(path, init);
  return result?.data ?? null;
}

// Share one request across Server Components in this render only. Published
// changes, expired signed URLs and personalized responses never persist here.
const loadWedding = cache((slug: string) => readPublicResponse<WeddingResponse>(`/api/public/wedding?slug=${encodeURIComponent(slug)}`));

export async function getPublicWedding(slug = process.env.NEXT_PUBLIC_WEDDING_SLUG ?? "binh-minh-ninh-hue") {
  const result = await loadWedding(slug);
  return result?.data ?? null;
}

export async function getWeddingPresentation(slug = process.env.NEXT_PUBLIC_WEDDING_SLUG ?? "binh-minh-ninh-hue") {
  const result = await loadWedding(slug);
  return result?.presentation ?? buildWeddingPresentation(null);
}

export function resolveInvitation(tokenHash: string) {
  return readPublicData<ResolvedInvitation>("/api/public/invitation", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tokenHash }),
  });
}
