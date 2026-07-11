import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "놀이의발견 · AI 광고 플랫폼",
  description: "Internal AI Advertising Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
