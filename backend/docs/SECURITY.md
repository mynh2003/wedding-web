# Backend abuse controls and image uploads

## Enable durable protection before production

1. Set `SUPABASE_SECRET_KEY` **only on backend**, using a Supabase secret key from project settings. Keep public reads on the publishable key. Do not copy this value into frontend, public env, logs or Git. Supabase secret keys bypass RLS; this app uses the server-only client solely for the rate-limit RPC and the two validated submission RPCs.
2. Set `WISH_RATE_LIMIT_SECRET` to a persistent random value of at least 32 characters, different between develop and production. This HMAC key pseudonymizes IP/account identifiers in counters.
3. Apply all earlier migrations, then `supabase/migrations/202610220001_backend_abuse_controls.sql` in Supabase SQL Editor. It adds an atomic, persistent rate limiter and revokes anonymous/authenticated execution of public submission RPCs. Approved wishes remain readable via `public_wishes`; the base table is private. Apply this migration only after the backend key is configured; otherwise submissions will be denied.
4. Deploy this backend and verify a normal login, a public wish and a personalized RSVP on test data. Confirm anonymous direct RPC calls receive permission denied, the sixth wish within ten minutes returns 429, and login throttling shows a generic message. Do not test submissions against production guests.

Without the private key, development uses a bounded in-memory limiter and the existing anonymous submission RPCs to keep local work usable. This is not durable across restarts/instances and does not close direct database RPC access. Production refuses protected requests with 503 when secrets, the migration or the persistent limiter are unavailable. Database changes have not been applied by merely adding this source file.

Vercel overwrites `x-forwarded-for`, which is trusted only when `VERCEL=1`. Elsewhere, set `TRUSTED_PROXY_IP_HEADER` only for an ingress that overwrites that header and prevents direct backend access. Without a trusted header all clients share a restrictive unknown-client bucket, rather than trusting arbitrary request headers. IP-based rules cannot prevent every distributed bot attack; use provider firewall controls for volumetric traffic.

| Scope | Limit |
| --- | --- |
| Public wish / RSVP | 5 per client / 10 minutes |
| Login | 10 per client and 10 per account / 15 minutes |
| Sensitive guest action password check | 5 per account / 15 minutes |
| Invitation resolution | 60 per client / minute |

Counters store HMAC digests, never raw email/IP. Expired rows are periodically deleted in bounded batches by the limiter. Login failures use the same message and redirect for an unknown account, unconfirmed email and missing admin permissions. This does not promise identical network timing. Admin authorization and same-origin CSRF checks are still required independently.

## Upload policy

The server bounds the multipart stream and checks file signatures before decoding. Static JPEG/PNG/WebP images are limited to 40 megapixels, normalized for EXIF orientation and resized within 2560×2560 without enlargement. PNG uses lossless WebP for QR/text/alpha; photos needing conversion use quality 84. A WebP already within bounds and correctly oriented is fully decoded for validation, then has EXIF/XMP/unknown container chunks removed while retaining its compressed pixels, alpha and ICC color profile. It is not subjected to another lossy encode. Output extension, MIME type, storage bytes and metadata are updated together. Animated/multi-page, corrupt and oversized images are rejected. Audio retains its signature validation and format.

Use an original or high-quality image and let the server handle it. Only resize/compress beforehand when the file exceeds the upload limit. Repeated lossy compression cannot recover detail. Resizing changes pixels even with a lossless output format; do not treat it as preservation of the original full resolution.

The Vercel limit remains 4 MiB per file, locally 10 MiB; converted output must also fit. Existing uploaded images are left intact. Re-upload through the dashboard to convert them; no bulk storage rewrite or database migration of media has been performed.

Sources: [Supabase keys](https://supabase.com/docs/guides/getting-started/api-keys), [database function permissions](https://supabase.com/docs/guides/database/functions), [Vercel request headers](https://vercel.com/docs/headers/request-headers), [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
