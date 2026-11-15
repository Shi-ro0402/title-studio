import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Title Studio｜AI記事タイトル候補ジェネレーター",
  description: "キーワード調査から記事企画、タイトル候補の作成・リライトまでを支援します。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
