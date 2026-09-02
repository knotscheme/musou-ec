import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { Sidebar } from "@/components/Sidebar";
import { ChatWidget } from "@/components/ChatWidget";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "MUSOU-EC — 完全無料のEC統合サポート",
  description:
    "楽天市場・Yahoo!ショッピング・Amazon・Shopify を運営するEC事業者向けの、ゼロコスト・アーキテクチャによる完全無料の統合サポートプラットフォーム。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <I18nProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            {/* モバイルは下部フローティングナビのぶん余白を足す */}
            <main className="flex-1 min-w-0 px-4 pb-28 pt-6 sm:px-8 lg:py-8 lg:pb-8">{children}</main>
          </div>
          <ChatWidget />
          <MobileNav />
        </I18nProvider>
      </body>
    </html>
  );
}
