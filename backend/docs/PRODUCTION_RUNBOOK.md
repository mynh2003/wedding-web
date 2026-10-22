# Production runbook

## Two independent applications

Source is physically split into `frontend/` (invitation) and `backend/` (API, auth, admin). Run npm ci inside each application. Each app owns its routes, components, dependencies, lockfile, configuration, types and build output. Neither app imports sibling or repository-root source.

Security rollout (22/10/2026): configure backend-only `SUPABASE_SECRET_KEY` and a strong persistent `WISH_RATE_LIMIT_SECRET` on every backend before applying `202610220001_backend_abuse_controls.sql`. Public writes and durable throttling require that key after migration; public reads keep anonymous RLS. Apply `202610220002_safe_media_cleanup.sql` for safe permanent image deletion. Ready SQL Editor bundle: `supabase/sql-editor/20261022_security_and_media.sql`. Details and prerequisites: [security](SECURITY.md), [media cleanup](MEDIA_CLEANUP.md).

| Setting | Frontend | Backend |
| --- | --- | --- |
| NEXT_PUBLIC_SITE_URL | https://invitation.example | https://invitation.example |
| NEXT_PUBLIC_API_URL | https://management.example.net | https://management.example.net |
| BACKEND_INTERNAL_URL | Internal backend URL, or public API URL | Not needed |
| INVITATION_LINK_ENCRYPTION_KEY | Not needed | Persistent server secret |
| WISH_RATE_LIMIT_SECRET | Not needed | Persistent server secret |

Each app config sets APP_ROLE automatically. Production requires distinct HTTPS public origins. Preserve canonical Host headers at the reverse proxy. Frontend internal requests set the configured backend Host. The backend owns a versioned JSON music catalog; MP3 files belong to frontend. Neither installation nor build requires sibling source. WEDDING_PUBLIC_DIR is an explicit optional dev override only.

Inside each service directory, run npm run build and npm start. Backend listens on 3001 and frontend on 3000. Configure each service with its own .env.local or deployment environment. Root .env is not loaded. Frontend receives only public Supabase configuration and its optional BACKEND_INTERNAL_URL; backend secrets stay in backend.

Production frontend serves invitation routes and rejects API/admin/auth routes with 404. Backend serves APIs/admin/auth and rejects invitation pages. Only public endpoints allow exact frontend-origin CORS. Admin cookies stay host-only, HttpOnly, Secure and SameSite=Lax, and never reach frontend requests. Admin forms use Referrer-Policy: same-origin; invitation links keep no-referrer.

Frontend Server Components fetch public data and resolve hashed invitation tokens through backend, with no-store and no forwarded cookies. Only browser realtime connects directly to Supabase, after the opening. Public backend reads use an anonymous client independent of admin sessions; RLS remains required. Personalized data, published content and signed URLs are never cached between requests.

Development: run `npm run dev` inside each app, or optionally `npm run dev:stack` inside backend when both apps share a checkout. This starts services on all interfaces, with separate .next-dev folders. Invitation is :3000/groom; admin is :3001/admin/login. Localhost and LAN IPs work. Only public APIs are proxied through frontend in development. Stop with Ctrl+C before starting again.

- Run `npm run audit:source`, `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`.
- Apply migrations and verify RLS, private storage, single admin mapping and published wedding/media.
- Deploy both services from the same revision; retain the prior build and a database backup for rollback.

## Smoke and performance checks

- Start each production artifact with `npm run start` on its service. Run the smoke script with `SMOKE_BASE_URL=https://invitation.example` and `SMOKE_API_URL=https://management.example.net`. It checks frontend route isolation, public CORS, backend health, and admin authorization. In PowerShell, set these using `$env:SMOKE_BASE_URL = 'https://invitation.example'` and `$env:SMOKE_API_URL = 'https://management.example.net'`, then run `npm run smoke` inside frontend.
- Run a controlled staging load test against public routes only. Keep concurrency and duration below provider quotas; never load test production or write endpoints.
- Measure mobile Core Web Vitals (LCP, INP, CLS) on the deployed preview with Lighthouse or Chrome DevTools. Record the result before release and after major media changes.
- Check `Cache-Control`, CSP, `X-Content-Type-Options`, and `Referrer-Policy` on both the landing page and API responses.

## Quota and incident handling

- If Supabase/Vercel quota or rate limits are approached, stop load tests, reduce media size, and disable nonessential writes before increasing resources.
- Public media uses private storage and signed URLs; keep upload size below 4 MiB on Vercel (10 MiB locally) and review storage usage periodically.
- Do not promise unlimited traffic or storage. Record provider limits and the date checked in the release notes.

## Backup and rollback

- Before schema changes, export the database through Supabase's supported backup/export mechanism and verify the backup timestamp.
- Keep the previous deployment and migration identifier recorded for each release.
- Roll back the application deployment first if a release is unhealthy. Roll back a migration only with a reviewed reverse migration or restore plan; do not edit production data ad hoc.
- After rollback, run the smoke test and verify admin login, public landing, published media, and approved wishes.


## Recoverable invitation links

Apply `supabase/migrations/202610180002_recoverable_invitation_links.sql` before deploying the recoverable-link backend. Set `INVITATION_LINK_ENCRYPTION_KEY` to one persistent 32-byte hex key on all backend instances and back it up separately from the database. Never expose it as NEXT_PUBLIC_ or print it in logs. Replacing the key prevents reopening existing saved links; it does not revoke their public URLs. Verify create → sign out/in → reopen/copy returns exactly the same URL, and that revoked URLs remain invalid. Legacy hash-only links cannot be recovered or automatically migrated. See [database setup](../supabase/README.md) for setup and rollout.
