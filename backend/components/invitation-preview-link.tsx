"use client";

import { useEffect, useState, type AnchorHTMLAttributes } from "react";
import { getInvitationOrigin } from "@/lib/invitation-origin";

export function InvitationPreviewLink({ children, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const [href, setHref] = useState(process.env.NEXT_PUBLIC_SITE_URL ?? "/");
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    setHref(getInvitationOrigin(window.location.origin, process.env.NEXT_PUBLIC_SITE_URL, true));
  }, []);
  return <a {...props} href={href}>{children}</a>;
}
