import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

// output: "export" では静的だと明示的に宣言する必要がある。
export const dynamic = "force-static";

/**
 * output: "export" 環境でもNext.jsが静的なrobots.txtとしてビルド時に書き出してくれる
 * (app/sitemap.tsと同じ仕組み)。mypage・settings・historyはローカル保存のみの
 * パーソナル画面で、誰が見ても同じ内容にならないため検索対象から除外する。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/mypage/", "/settings/", "/history/"],
    },
    sitemap: getSiteUrl("/sitemap.xml"),
  };
}
