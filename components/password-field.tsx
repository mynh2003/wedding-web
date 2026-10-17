"use client";

import { useState } from "react";

export function PasswordField() {
  const [visible, setVisible] = useState(false);
  return <div className="relative mt-2">
    <input name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={256} className="w-full rounded-lg border border-wine/10 bg-cream px-4 py-3 pr-20 text-sm outline-none focus:border-gold" />
    <button type="button" onClick={() => setVisible((value) => !value)} className="absolute inset-y-0 right-3 text-xs font-semibold text-wine/70" aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{visible ? "Ẩn" : "Hiện"}</button>
  </div>;
}
