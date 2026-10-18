import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bình Minh - Ninh Huệ",
  description: "Thiệp cưới điện tử — trân trọng kính mời bạn chung vui.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
