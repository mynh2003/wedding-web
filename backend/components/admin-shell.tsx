"use client";

import Link from "next/link";
import { InvitationPreviewLink } from "@/components/invitation-preview-link";
import { AdminIcon } from "@/components/admin-icon";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export { AdminIcon } from "@/components/admin-icon";

const navigation = [
  { href: "/admin", label: "Tổng quan", mobileLabel: "Tổng quan", icon: "overview" },
  { href: "/admin/guests", label: "Khách mời", mobileLabel: "Khách mời", icon: "guests" },
  { href: "/admin/wishes", label: "Lời chúc", mobileLabel: "Lời chúc", icon: "wishes" },
  { href: "/admin/content", label: "Nội dung & hình ảnh", mobileLabel: "Thiệp cưới", icon: "content" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return <div className="admin-ui admin-login">{children}</div>;
  const active = navigation.find(item => item.href === pathname);

  return <div className="admin-ui admin-shell">
    <a href="#admin-content" className="admin-skip">Đến nội dung chính</a>
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-brand"><span className="admin-brand-mark"><AdminIcon name="heart" /></span><span>Minh & Huệ<small>KHÔNG GIAN NGÀY VUI</small></span></Link>
      <p className="admin-nav-label">Quản lý thiệp cưới</p>
      <nav aria-label="Điều hướng quản trị">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`admin-nav-link ${pathname === item.href ? "is-active" : ""}`}>
        <span className="admin-nav-icon"><AdminIcon name={item.icon} /></span>
        <span className="admin-nav-desktop-label">{item.label}</span><span className="admin-nav-mobile-label">{item.mobileLabel}</span>
        {pathname === item.href && <span className="admin-active-dot" />}
      </Link>)}</nav>
      <div className="admin-sidebar-bottom">
        <div className="admin-preview-note"><span className="admin-icon-tile rose"><AdminIcon name="sparkle" /></span><strong>Một ngày thật đặc biệt</strong><p>Chăm chút lời mời, lưu giữ yêu thương.</p><InvitationPreviewLink target="_blank" rel="noreferrer">Mở thiệp cưới <AdminIcon name="external" /></InvitationPreviewLink></div>
        <form action="/auth/logout" method="post"><button className="admin-nav-link admin-logout"><AdminIcon name="logout" />Đăng xuất</button></form>
      </div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <div className="admin-topbar-title"><Link href="/admin" className="admin-mobile-brand" aria-label="Minh và Huệ · Tổng quan"><AdminIcon name="heart" /></Link><div><span className="admin-topbar-eyebrow">Minh & Huệ</span><div className="admin-breadcrumb"><span>Không gian quản trị</span><AdminIcon name="chevron" /><strong>{active?.label ?? "Tổng quan"}</strong></div></div></div>
        <div className="admin-topbar-actions">
          <InvitationPreviewLink target="_blank" rel="noreferrer" className="admin-button admin-button-secondary admin-topbar-preview" aria-label="Xem trước thiệp cưới (mở tab mới)"><AdminIcon name="external" /><span>Xem thiệp</span></InvitationPreviewLink>
          <div className="admin-account"><span className="admin-avatar">MH</span><span><strong>Quản trị viên</strong><small>Minh & Huệ</small></span></div>
          <form action="/auth/logout" method="post" className="admin-mobile-logout"><button className="admin-button admin-button-ghost admin-icon-button" aria-label="Đăng xuất" title="Đăng xuất"><AdminIcon name="logout" /></button></form>
        </div>
      </header>
      <div id="admin-content" className="admin-content" tabIndex={-1}>{children}</div>
      <footer className="admin-footer"><span><AdminIcon name="heart" /> Minh & Huệ</span><span>Chuẩn bị ngày vui, theo cách của bạn.</span></footer>
    </div>
  </div>;
}

export function AdminHeading({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }) {
  return <div className="admin-heading"><div>{eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{children && <div className="admin-heading-actions">{children}</div>}</div>;
}
