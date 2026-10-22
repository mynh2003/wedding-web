import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { createWriteClient } from "@/lib/supabase/privileged";

const limits = {
  wish: { count: 5, seconds: 600 },
  "login-ip": { count: 10, seconds: 900 },
  "login-account": { count: 10, seconds: 900 },
  reauth: { count: 5, seconds: 900 },
  invitation: { count: 60, seconds: 60 },
} as const;
type Scope = keyof typeof limits;
type Bucket = { count: number; expires: number };
const developmentKey = randomBytes(32).toString("hex");
const buckets = new Map<string, Bucket>();
const maxBuckets = 5_000;

function secret() {
  const value = process.env.WISH_RATE_LIMIT_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32 || /replace|placeholder/i.test(value))) {
    throw new Error("Backend security configuration is incomplete.");
  }
  return value || developmentKey;
}

export function requestFingerprint(request: Request, subject?: string) {
  // Vercel replaces XFF at its edge. Other production proxies must explicitly
  // name a header they overwrite; arbitrary browser-supplied XFF is not trusted.
  const header = process.env.VERCEL === "1" ? "x-forwarded-for" : process.env.TRUSTED_PROXY_IP_HEADER;
  const candidate = header ? request.headers.get(header)?.split(",")[0]?.trim() : undefined;
  const address = candidate && isIP(candidate) ? candidate.toLowerCase() : "shared-unknown-client";
  return createHmac("sha256", secret()).update(subject === undefined ? `ip:${address}` : `account:${subject.trim().toLowerCase()}`).digest("hex");
}

export function consumeLocalLimit(scope: Scope, key: string, now = Date.now()) {
  const policy = limits[scope];
  const id = `${scope}:${key}`;
  const previous = buckets.get(id);
  if (previous && previous.expires > now) {
    if (previous.count >= policy.count) return Math.max(1, Math.ceil((previous.expires - now) / 1000));
    previous.count += 1;
    return 0;
  }
  for (const [entry, bucket] of buckets) if (bucket.expires <= now) buckets.delete(entry);
  // Saturation must not evict live counters, which would reset abuse limits.
  if (buckets.size >= maxBuckets) return policy.seconds;
  buckets.set(id, { count: 1, expires: now + policy.seconds * 1000 });
  return 0;
}

export async function limitRequest(request: Request, scope: Scope, subject?: string) {
  let retryAfter: number;
  try {
    const key = requestFingerprint(request, subject);
    if (process.env.SUPABASE_SECRET_KEY) {
      const { data, error } = await createWriteClient().rpc("consume_request_limit", { input_scope: scope, input_subject: key });
      if (error || typeof data !== "number" || !Number.isFinite(data) || data < 0) throw new Error("Limiter unavailable");
      retryAfter = Math.ceil(data);
    } else {
      if (process.env.NODE_ENV === "production") throw new Error("Persistent limiter required");
      retryAfter = consumeLocalLimit(scope, key);
    }
  } catch {
    return NextResponse.json({ error: "Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau." }, {
      status: 503, headers: { "Cache-Control": "private, no-store", "Retry-After": "60" },
    });
  }
  return retryAfter > 0 ? NextResponse.json({ error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau." }, {
    status: 429, headers: { "Cache-Control": "private, no-store", "Retry-After": String(retryAfter) },
  }) : null;
}
