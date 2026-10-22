"use client";

import { useState } from "react";
import { AdminIcon } from "@/components/admin-icon";

export function PasswordField() {
  const [visible, setVisible] = useState(false);
  return <div className="relative mt-2">
    <input id="admin-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={256} className="admin-input admin-password-input" />
    <button type="button" onClick={() => setVisible((value) => !value)} className="admin-password-toggle" aria-controls="admin-password" aria-pressed={visible} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}><AdminIcon name={visible ? "hide" : "eye"} /></button>
  </div>;
}
