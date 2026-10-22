import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Public reads always run as the anonymous role. An administrator's browser
// session must never change what an invitation can read from the database.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
