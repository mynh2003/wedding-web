import type { Metadata } from "next";
import { fontPreloads } from "./fonts";
import "./fonts.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bình Minh - Ninh Huệ",
  description: "Thiệp cưới điện tử — trân trọng kính mời bạn chung vui.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <head>
        {fontPreloads.map((href) => <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />)}
      </head>
      <body>{children}</body>
    </html>
  );
}
