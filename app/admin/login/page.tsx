import { PasswordField } from "@/components/password-field";

export default function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <LoginForm searchParams={searchParams} />;
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6">
      <form action="/auth/login" method="post" className="w-full max-w-md rounded-2xl border border-wine/10 bg-white/60 p-8 shadow-soft">
        <p className="text-xs uppercase tracking-[.3em] text-gold">Admin</p>
        <h1 className="mt-3 font-display text-5xl text-wine">Đăng nhập</h1>
        <p className="mt-4 text-sm leading-7 text-ink/60">Chỉ tài khoản quản trị duy nhất đã xác minh email mới được truy cập.</p>
        {params.error === "forbidden" && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Phiên đăng nhập không hợp lệ từ địa chỉ hiện tại. Hãy tải lại trang và thử lại.</p>}
        {params.error === "invalid" && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Email hoặc mật khẩu không đúng, hoặc email chưa được xác minh.</p>}
        {params.error === "unconfirmed" && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Email Supabase chưa được xác minh.</p>}
        {params.error === "not-admin" && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Tài khoản đúng nhưng chưa được cấp quyền admin trong bảng <code>admin_users</code>.</p>}
        <label htmlFor="admin-email" className="mt-7 block text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Email</label>
        <input id="admin-email" name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-lg border border-wine/10 bg-cream px-4 py-3 text-sm outline-none focus:border-gold" />
        <label htmlFor="admin-password" className="mt-5 block text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Mật khẩu</label>
        <PasswordField />
        <button className="mt-7 w-full rounded-full bg-wine px-6 py-3 text-sm font-semibold text-cream transition hover:bg-ink">Đăng nhập</button>
      </form>
    </main>
  );
}
