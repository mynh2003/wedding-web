import { requireAdmin } from "@/lib/auth/admin";

export default async function AdminPage() {
  const { user } = await requireAdmin();
  return (
    <main className="min-h-screen bg-cream px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-[.3em] text-gold">Admin dashboard</p>
        <h1 className="mt-3 font-display text-6xl text-wine">Xin chào</h1>
        <p className="mt-4 text-sm text-ink/60">Phiên quản trị đã được xác minh phía server.</p>
        <form action="/auth/logout" method="post" className="mt-8"><button className="rounded-full border border-wine px-5 py-3 text-sm font-semibold text-wine">Đăng xuất</button></form>
        <p className="mt-8 text-xs text-ink/45">Tài khoản hiện tại: {user.email}</p>
      </div>
    </main>
  );
}
