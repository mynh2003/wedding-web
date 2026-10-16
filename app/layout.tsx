import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bình Minh & Ninh Thị Huệ — Wedding Invitation",
  description: "Một lời mời trân trọng cho ngày vui của Bình Minh và Ninh Thị Huệ.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
