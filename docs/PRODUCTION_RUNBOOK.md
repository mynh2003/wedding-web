# Production runbook — Phase 7

## Before deploy

### Separate frontend and backend domains

Deploy this repository as **two services**. Set the following variables before
building, and retain them at runtime:

| Setting | Frontend service | Backend service |
| --- | --- | --- |
| `APP_ROLE` | `frontend` | `backend` |
| `NEXT_PUBLIC_SITE_URL` | `https://invitation.example` | `https://invitation.example` |
| `NEXT_PUBLIC_API_URL` | `https://management.example.net` | `https://management.example.net` |

Replace the example origins with your actual domains. Both production origins
must use HTTPS and must differ. Production refuses to start without this
configuration. Use separate registrable domains if you also want browser
same-site isolation; subdomains provide different origins but remain same-site.
Point each domain to its corresponding service and provision TLS at the host.
Preview deployments need their own pair of configured origins; unconfigured host
aliases are rejected for application routes.
If using a reverse proxy, preserve the canonical public `Host` header when
forwarding requests to Next.js.

The frontend serves invitation pages and rejects `/api`, `/admin` and `/auth`
with 404. The backend serves APIs and `/admin/login`, and rejects invitation
pages. Static assets are built for each service. Keep `public/music` in both
builds: the music API returns a relative frontend asset URL.

Public browser API calls use `NEXT_PUBLIC_API_URL`, exact-origin CORS, and omit
cookies. Admin UI and APIs stay together on the backend origin, with server-side
authorization and backend-origin CSRF checks. Session cookies are host-only,
HttpOnly, Secure in production, and SameSite=Lax; do not add a parent-domain
cookie setting. Do not proxy backend API paths through the frontend domain.

This is deployment separation within one Next.js repository, not a static-only
frontend or a separate backend codebase. Invitation Server Components still
read published data and resolve invitation tokens through Supabase with RLS.
Browser Realtime also connects directly to Supabase; the CSP explicitly permits
the configured HTTPS and WebSocket origins. Keep the existing Supabase URL,
publishable key and wedding slug configured on both services. Set
`WISH_RATE_LIMIT_SECRET` on the backend only. Domain separation does not replace
RLS, admin authorization or rate limiting.

For local development, unset `APP_ROLE` and `NEXT_PUBLIC_API_URL` to keep
`npm run dev` on port 3000. To exercise split services, set both origins to
`http://localhost:3000` and `http://localhost:3001`, then run separate terminals
with `APP_ROLE=frontend` on port 3000 and `APP_ROLE=backend` on port 3001. Use
separate checkouts for concurrent dev servers so their `.next` outputs do not
conflict. The split configuration is required for production.

- Run `npm ci`, `npm run audit`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Configure only the required environment variables in the hosting provider. Never expose a service-role key to the browser.
- Apply Supabase migrations in order through Phase 6 and verify RLS, storage bucket privacy, and the single admin mapping.
- Confirm the wedding is published only after content and media are reviewed.

## Smoke and performance checks

- Start each production artifact with `npm run start` on its service. Run the smoke script with `SMOKE_BASE_URL=https://invitation.example` and `SMOKE_API_URL=https://management.example.net`. It checks frontend route isolation, public CORS, backend health, and admin authorization. In PowerShell, set these using `$env:SMOKE_BASE_URL = 'https://invitation.example'` and `$env:SMOKE_API_URL = 'https://management.example.net'`, then run `npm run smoke`.
- Run a controlled staging load test against public routes only. Keep concurrency and duration below provider quotas; never load test production or write endpoints.
- Measure mobile Core Web Vitals (LCP, INP, CLS) on the deployed preview with Lighthouse or Chrome DevTools. Record the result before release and after major media changes.
- Check `Cache-Control`, CSP, `X-Content-Type-Options`, and `Referrer-Policy` on both the landing page and API responses.

## Quota and incident handling

- If Supabase/Vercel quota or rate limits are approached, stop load tests, reduce media size, and disable nonessential writes before increasing resources.
- Public media uses private storage and signed URLs; keep upload size at 10MB and review storage usage periodically.
- Do not promise unlimited traffic or storage. Record provider limits and the date checked in the release notes.

## Backup and rollback

- Before schema changes, export the database through Supabase's supported backup/export mechanism and verify the backup timestamp.
- Keep the previous deployment and migration identifier recorded for each release.
- Roll back the application deployment first if a release is unhealthy. Roll back a migration only with a reviewed reverse migration or restore plan; do not edit production data ad hoc.
- After rollback, run the smoke test and verify admin login, public landing, published media, and approved wishes.


## Recoverable invitation links

Apply `supabase/migrations/202610180002_recoverable_invitation_links.sql` before deploying the recoverable-link backend. Set `INVITATION_LINK_ENCRYPTION_KEY` to one persistent 32-byte hex key on all backend instances and back it up separately from the database. Never expose it as NEXT_PUBLIC_ or print it in logs. Replacing the key prevents reopening existing saved links; it does not revoke their public URLs. Verify create → sign out/in → reopen/copy returns exactly the same URL, and that revoked URLs remain invalid. Legacy hash-only links cannot be recovered or automatically migrated. See `supabase/README.md` for setup and rollout.
