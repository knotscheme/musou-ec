import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { Sidebar } from "@/components/Sidebar";
import { ChatWidget } from "@/components/ChatWidget";
import { MobileNav } from "@/components/MobileNav";
import { ThemeSync } from "@/components/ThemeSync";
import { getSiteUrl, SITE_BASE_URL } from "@/lib/site-url";
import { safeJsonLd } from "@/lib/json-ld";

// FOUC 回避：描画前に保存済みテーマを <html> へ反映
const THEME_BOOT = `(function(){try{var p=localStorage.getItem('musou.theme')||'system';var r=document.documentElement;r.setAttribute('data-theme',p);var d=p==='dark'||(p!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);r.classList.toggle('theme-dark',d);}catch(e){}})();`;

const SITE_TITLE = "MUSOU-EC(無双EC) — 楽天・Yahoo・Amazon・Shopify向け完全無料のEC支援ツール集";
const SITE_DESCRIPTION =
  "楽天市場・Yahoo!ショッピング・Amazon・Shopify(自社サイト)を運営するEC事業者向けの、完全無料の統合サポートプラットフォーム。サムネイルのテキスト占有率チェック、CSV一括編集、広告ACoSシミュレーターなど、各モールの実務でそのまま使えるツールをブラウザだけで提供します。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_BASE_URL),
  title: { default: SITE_TITLE, template: "%s | MUSOU-EC" },
  description: SITE_DESCRIPTION,
  keywords: [
    "楽天 無料ツール",
    "Yahooショッピング 無料ツール",
    "Amazon せどり ツール",
    "EC運営 効率化",
    "楽天 サムネイル テキスト率",
    "RMS CSV 編集",
    "Amazon ACoS シミュレーター",
    "Shopify 構造化データ",
    "無双EC",
  ],
  alternates: { canonical: getSiteUrl("/") },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: getSiteUrl("/"),
    siteName: "MUSOU-EC",
    locale: "ja_JP",
    type: "website",
    images: [{ url: getSiteUrl("/opengraph-image") }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [getSiteUrl("/opengraph-image")],
  },
  // Google Search Console 所有権確認(2026-09)。HTMLタグ方式(URLプレフィックスプロパティ、
  // https://knotscheme.github.io/musou-ec/)。
  verification: {
    google: "MzHBACFTr0rrpZ4CLuxa7gcpIwkIvb6u3JVl5rh7xk8",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "MUSOU-EC",
  alternateName: "無双EC",
  url: SITE_BASE_URL,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* body 先頭のインラインスクリプト＝HTMLパース中に同期実行され、描画前にテーマを確定させる */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }} />
        <ThemeSync />
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
