import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "病历通",
  description: "AI辅助病历书写工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
