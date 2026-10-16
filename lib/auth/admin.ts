import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email_confirmed_at) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id, wedding_id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!admin) return null;
  return { user, admin, supabase };
}

export async function requireAdmin() {
  const result = await getAdmin();
  if (!result) redirect("/admin/login");
  return result;
}
