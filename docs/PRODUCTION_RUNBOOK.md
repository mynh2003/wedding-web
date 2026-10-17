# Production runbook — Phase 7

## Before deploy

- Run `npm ci`, `npm run audit`, `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Configure only the required environment variables in the hosting provider. Never expose a service-role key to the browser.
- Apply Supabase migrations in order through Phase 6 and verify RLS, storage bucket privacy, and the single admin mapping.
- Confirm the wedding is published only after content and media are reviewed.

## Smoke and performance checks

- Start the production artifact with `npm run start`, then run `SMOKE_BASE_URL=http://localhost:3000 npm run smoke`.
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
