import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminHeading, AdminIcon } from "@/components/admin-shell";

export default async function AdminPage() {
  const { user, admin, supabase } = await requireAdmin();
  const [guests, pending, content, recent] = await Promise.all([
    supabase.from("guests").select("id", { count: "exact", head: true }).eq("wedding_id", admin.wedding_id),
    supabase.from("wishes").select("id", { count: "exact", head: true }).eq("wedding_id", admin.wedding_id).eq("status", "pending"),
    supabase.from("wedding_content").select("section_key", { count: "exact", head: true }).eq("wedding_id", admin.wedding_id).eq("is_published", true),
    supabase.from("wishes").select("id, author_name, message, status, created_at").eq("wedding_id", admin.wedding_id).order("created_at", { ascending: false }).limit(4),
  ]);
  const stats = [
    { label: "Khách mời", value: guests.error ? "—" : guests.count ?? 0, note: "Khách đã thêm vào danh sách", href: "/admin/guests", icon: "guests", tone: "rose" },
    { label: "Lời chúc chờ duyệt", value: pending.error ? "—" : pending.count ?? 0, note: "Duyệt để hiển thị trên thiệp", href: "/admin/wishes", icon: "wishes", tone: "amber" },
    { label: "Mục đã xuất bản", value: content.error ? "—" : content.count ?? 0, note: "Nội dung đang hiển thị công khai", href: "/admin/content", icon: "content", tone: "sage" },
  ];
  return <main>
    <AdminHeading eyebrow="NGÀY VUI, CHUẨN BỊ THẬT DỄ DÀNG" title="Chào mừng trở lại" description="Mọi thứ cho tấm thiệp của bạn, trong một không gian."><a href={process.env.NEXT_PUBLIC_SITE_URL ?? "/"} target="_blank" rel="noreferrer" className="admin-button admin-button-secondary"><AdminIcon name="external" />Xem thiệp cưới</a></AdminHeading>
    <section className="admin-welcome"><div><span className="admin-welcome-tag">THIỆP CƯỚI CỦA CHÚNG MÌNH</span><h2>Bình Minh & Ninh Huệ</h2><p>Một lời mời riêng, một niềm vui chung.<br />Bắt đầu bằng việc thêm những vị khách thân thương.</p><Link href="/admin/guests" className="admin-button admin-button-light">Thêm khách mời <AdminIcon name="arrow" /></Link></div><div className="admin-welcome-art" aria-hidden="true"><span>MH</span><AdminIcon name="heart" /></div></section>
    <section className="admin-stats" aria-label="Số liệu tổng quan">{stats.map((stat) => <Link href={stat.href} key={stat.label} className="admin-stat"><div className="admin-stat-top"><span className={`admin-icon-tile ${stat.tone}`}><AdminIcon name={stat.icon} /></span><AdminIcon name="arrow" /></div><p>{stat.label}</p><strong>{stat.value}</strong><small>{stat.note}</small></Link>)}</section>
    {(guests.error || pending.error || content.error || recent.error) && <p className="admin-notice" role="status">Một số dữ liệu chưa tải được. Bạn có thể tải lại trang để thử lại.</p>}
    <div className="admin-dashboard-grid"><section className="admin-card"><div className="admin-section-heading"><div><h2>Lời chúc gần đây</h2><p>Những yêu thương gửi đến hai bạn.</p></div><Link href="/admin/wishes" className="admin-text-link">Xem tất cả <AdminIcon name="arrow" /></Link></div>{recent.data?.length ? <div className="admin-recent-list">{recent.data.map((wish) => <article key={wish.id} className="admin-recent"><span className="admin-avatar">{wish.author_name.slice(0, 1).toUpperCase()}</span><div><strong>{wish.author_name}</strong><p>{wish.message}</p><small>{new Date(wish.created_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small></div><span className={`admin-badge ${wish.status === "approved" ? "sage" : wish.status === "pending" ? "amber" : "neutral"}`}>{wish.status === "approved" ? "Đã duyệt" : wish.status === "pending" ? "Chờ duyệt" : "Đã ẩn"}</span></article>)}</div> : <div className="admin-empty"><span className="admin-icon-tile rose"><AdminIcon name="wishes" /></span><h3>{recent.error ? "Chưa tải được lời chúc" : "Đang chờ những lời yêu thương"}</h3><p>{recent.error ? "Tải lại trang để thử lại." : "Lời chúc từ khách mời sẽ xuất hiện tại đây."}</p></div>}</section>
    <section className="admin-card"><div className="admin-section-heading"><div><h2>Thao tác nhanh</h2><p>Chăm chút từng chi tiết nhỏ.</p></div></div><div className="admin-quick-links">{[{ href: "/admin/guests", icon: "guests", title: "Gửi lời mời riêng", text: "Thêm khách và tạo đường dẫn thiệp." }, { href: "/admin/content", icon: "content", title: "Chỉnh sửa thiệp cưới", text: "Cập nhật nội dung, hình ảnh và âm nhạc." }, { href: "/admin/wishes", icon: "wishes", title: "Duyệt lời chúc", text: "Chọn lời chúc để chia sẻ trên thiệp." }].map((item) => <Link href={item.href} key={item.href}><span className="admin-icon-tile neutral"><AdminIcon name={item.icon} /></span><span><strong>{item.title}</strong><small>{item.text}</small></span><AdminIcon name="arrow" /></Link>)}</div><div className="admin-account-note">Đang đăng nhập với <strong>{user.email}</strong></div></section></div>
  </main>;
}
