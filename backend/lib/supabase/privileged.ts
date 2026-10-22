import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createPublicClient } from "@/lib/supabase/public-server";

// Only abuse counters and public submissions use this client. Public reads and
// administrative queries continue to use their existing RLS-scoped clients.
export function createWriteClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") return createPublicClient();
    throw new Error("Backend security configuration is incomplete.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
