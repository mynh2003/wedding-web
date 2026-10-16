import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Minh & Hương — Wedding Invitation",
  description: "Một lời mời trân trọng cho ngày vui của Minh và Hương.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
