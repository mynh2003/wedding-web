import { ContentManager } from "@/components/content-manager";
import { requireAdmin } from "@/lib/auth/admin";
export default async function AdminContentPage() { await requireAdmin(); return <ContentManager />; }
