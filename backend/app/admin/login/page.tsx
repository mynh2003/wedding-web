import { PasswordField } from "@/components/password-field";
import { AdminIcon } from "@/components/admin-icon";
import { AdminLoginForm } from "@/components/admin-login-form";

export default function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <LoginForm searchParams={searchParams} />;
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6">
      <AdminLoginForm>
        <span className="admin-brand-mark" aria-hidden="true"><AdminIcon name="heart" /></span>
        <p className="text-xs font-semibold tracking-wide text-wine/70">MINH & HUỆ · KHÔNG GIAN QUẢN TRỊ</p>
        <h1 className="mt-3 font-display text-5xl text-wine">Đăng nhập</h1>
        <p className="mt-3 text-sm leading-7 text-ink/60">Chào mừng trở lại. Đăng nhập để chuẩn bị ngày vui của hai bạn.</p>
        {params.error === "forbidden" && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Phiên đăng nhập không hợp lệ từ địa chỉ hiện tại. Hãy tải lại trang và thử lại.</p>}
        {["invalid", "unconfirmed", "not-admin"].includes(params.error ?? "") && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Không thể đăng nhập. Vui lòng kiểm tra thông tin tài khoản.</p>}
        {params.error === "limited" && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.</p>}
        {params.error === "unavailable" && <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">Dịch vụ đăng nhập tạm thời chưa sẵn sàng. Vui lòng thử lại sau.</p>}
        <label htmlFor="admin-email" className="mt-7 block text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Email</label>
        <input id="admin-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="Email quản trị của bạn" required className="admin-input mt-2" />
        <label htmlFor="admin-password" className="mt-5 block text-xs font-semibold uppercase tracking-[.2em] text-wine/60">Mật khẩu</label>
        <PasswordField />
      </AdminLoginForm>
    </main>
  );
}
