"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AdminIcon } from "@/components/admin-icon";

export function AdminLoginForm({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const reset = () => setPending(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return <form action="/auth/login" method="post" onSubmit={() => setPending(true)} aria-busy={pending} className="w-full max-w-md rounded-2xl border border-wine/10 bg-white/60 p-8 shadow-soft">
    {children}
    <button type="submit" className="admin-button mt-7 w-full" disabled={pending}><AdminIcon name={pending ? "loader" : "lock"} />{pending ? "Đang đăng nhập…" : "Đăng nhập"}</button>
  </form>;
}
