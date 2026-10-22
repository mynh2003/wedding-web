import { requireAdmin } from "@/lib/auth/admin";
import { GuestManager } from "@/components/guest-manager";

export default async function AdminGuestsPage() {
  await requireAdmin();
  return <GuestManager />;
}
