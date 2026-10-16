# Supabase Phase 3 setup

1. Create a Supabase project and copy its URL and publishable key to `.env.local`.
2. Run `migrations/202610160001_phase3_foundation.sql` in the Supabase SQL editor or through the Supabase CLI.
3. Create exactly one Auth user manually in the Supabase dashboard. Require email confirmation; do not expose signup in the app.
4. Create one `weddings` row, then insert the single mapping into `admin_users` from the SQL editor. Never put a service-role key in browser code.
5. Verify with a non-admin session that `guests`, `invitation_links` and `admin_users` are not readable, and that only published public rows are visible.

The migration deliberately does not create public insert policies for `wishes`; that endpoint belongs to Phase 5 and must add server validation and rate limiting first.
