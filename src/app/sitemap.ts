import type { MetadataRoute } from "next";

import { TOOLS } from "@/lib/malls";
import { getSiteUrl } from "@/lib/site-url";

// output: "export" では静的だと明示的に宣言する必要がある。
export const dynamic = "force-static";

/**
 * output: "export" でもNext.jsがビルド時に静的なsitemap.xmlを書き出す。
 * ツールページ(/tools/[slug]/)は外部リンクのツール(external)を除いた全件を対象にする
 * (tools/[slug]/page.tsxのgenerateStaticParamsと同じフィルタ条件)。
 * mypage・settings・historyはrobots.tsと同じ理由で対象外。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const toolEntries: MetadataRoute.Sitemap = TOOLS.filter((tool) => !tool.external).map((tool) => ({
    url: getSiteUrl(`/tools/${tool.slug}/`),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    { url: getSiteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: getSiteUrl("/wishlist/"), changeFrequency: "weekly", priority: 0.5 },
    { url: getSiteUrl("/learn/"), changeFrequency: "weekly", priority: 0.6 },
    ...toolEntries,
  ];
}
