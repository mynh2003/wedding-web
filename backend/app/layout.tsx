import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Quản trị thiệp cưới · Minh & Huệ", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f5f8", colorScheme: "light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}</body></html>;
}
