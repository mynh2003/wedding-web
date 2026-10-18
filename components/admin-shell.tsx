"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  { href: "/admin", label: "Tổng quan", icon: "overview" },
  { href: "/admin/guests", label: "Khách mời", icon: "guests" },
  { href: "/admin/wishes", label: "Lời chúc", icon: "wishes" },
  { href: "/admin/content", label: "Nội dung & hình ảnh", icon: "content" },
];

export function AdminIcon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    guests: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5" /></>,
    wishes: <><path d="M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0Z" /><path d="m8 10 3 3 5-5" /></>,
    content: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1" /><path d="m3 16 5-5 5 5 3-3 5 5" /></>,
    arrow: <path d="m9 5 7 7-7 7M4 12h12" />,
    external: <><path d="M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></>,
    logout: <><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M10 12h11m-4-4 4 4-4 4" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  };
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.overview}</svg>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <div className="admin-ui admin-login">{children}</div>;
  const active = navigation.find((item) => item.href === pathname);
  return <div className="admin-ui admin-shell">
    <a href="#admin-content" className="admin-skip">Đến nội dung chính</a>
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-brand"><span className="admin-brand-mark"><AdminIcon name="heart" /></span><span>Minh & Huệ<small>QUẢN LÝ THIỆP CƯỚI</small></span></Link>
      <p className="admin-nav-label">Không gian quản trị</p>
      <nav aria-label="Điều hướng quản trị">{navigation.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`admin-nav-link ${pathname === item.href ? "is-active" : ""}`}><AdminIcon name={item.icon} /><span>{item.label}</span>{pathname === item.href && <span className="admin-active-dot" />}</Link>)}</nav>
      <div className="admin-sidebar-bottom"><div className="admin-preview-note"><AdminIcon name="heart" /><strong>Một ngày thật đặc biệt</strong><p>Chuẩn bị lời mời, lưu giữ yêu thương.</p><a href={process.env.NEXT_PUBLIC_SITE_URL ?? "/"} target="_blank" rel="noreferrer">Xem thiệp cưới <AdminIcon name="external" /></a></div><form action="/auth/logout" method="post"><button className="admin-nav-link"><AdminIcon name="logout" />Đăng xuất</button></form></div>
    </aside>
    <div className="admin-workspace"><header className="admin-topbar"><div className="admin-breadcrumb">Quản trị <span>/</span> <strong>{active?.label ?? "Tổng quan"}</strong></div><div className="admin-account"><span className="admin-avatar">MH</span><span><strong>Quản trị viên</strong><small>Minh & Huệ</small></span></div></header><div id="admin-content" className="admin-content" tabIndex={-1}>{children}</div><footer className="admin-footer">Minh & Huệ <span>Được chuẩn bị bằng tất cả yêu thương.</span></footer></div>
  </div>;
}

export function AdminHeading({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }) {
  return <div className="admin-heading"><div>{eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
