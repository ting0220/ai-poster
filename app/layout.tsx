import type { Metadata } from "next";
import "./globals.css";
import PublicLayout from "./templates/_components/PublicLayout";

export const metadata: Metadata = {
  title: "AI 海报生成系统",
  description: "选择模板并批量生成海报",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <PublicLayout>{children}</PublicLayout>
      </body>
    </html>
  );
}
