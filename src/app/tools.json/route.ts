import { NextResponse } from "next/server";

import { MALLS, TOOLS } from "@/lib/malls";

// output: "export" では静的だと明示的に宣言する必要がある(robots.ts等と同じ)。
export const dynamic = "force-static";

/**
 * Spider運営者コンソールの「無双ECアナリティクス」が、アクセス計測データの
 * toolSlug(例: "rakuten-page-builder")を実際のツール名(例: "楽天ページビルダー")に
 * 変換して表示するために参照する、ビルド時生成の静的JSON。
 *
 * ユーザー指示(2026-09)「今後無双ecにツールを追加したらそこまで紐付けさせるように」への
 * 対応の一部。TOOLS(malls.ts)から自動生成されるため、ツールを追加・改名しても
 * Spider側のコードは一切変更不要(次回のSpider側フェッチで自動的に反映される)。
 */
export function GET() {
  const data = TOOLS.filter((t) => !t.external).map((t) => ({
    slug: t.slug,
    name: t.name,
    mall: t.mall,
    mallLabel: MALLS[t.mall].label,
  }));
  return NextResponse.json(data);
}
