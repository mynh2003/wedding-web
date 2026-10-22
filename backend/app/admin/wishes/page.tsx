import { WishManager } from "@/components/wish-manager";
import { requireAdmin } from "@/lib/auth/admin";
export default async function AdminWishesPage() { await requireAdmin(); return <WishManager />; }
