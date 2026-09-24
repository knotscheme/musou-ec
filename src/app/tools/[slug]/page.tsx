import type { Metadata } from "next";

import { MALLS, TOOLS } from "@/lib/malls";
import { getSiteUrl } from "@/lib/site-url";
import { MockTool } from "@/components/MockTool";
import { TOOL_COMPONENTS } from "@/tools/registry";

export function generateStaticParams() {
  // 外部リンクのツール（external）は自前のページを持たない
  return TOOLS.filter((t) => !t.external).map((t) => ({ slug: t.slug }));
}

export const dynamicParams = false;

/**
 * ツールごとに個別のタイトル・説明文を設定する(2026-09 SEO対応)。全ページが
 * ルートlayout.tsxの汎用title/descriptionを共有していたため、47件のツールページが
 * 検索エンジンから見て無差別化だった。各ツールの`summary`(malls.ts、元々UI表示用に
 * 用意されていた説明文)をそのままmeta descriptionに転用できる。
 */
export function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return params.then(({ slug }) => {
    const tool = TOOLS.find((t) => t.slug === slug);
    if (!tool) return {};

    const mallLabel = MALLS[tool.mall].label;
    const title = `${tool.name}(${mallLabel}向け無料ツール)`;
    const url = getSiteUrl(`/tools/${slug}/`);

    return {
      title,
      description: tool.summary,
      alternates: { canonical: url },
      openGraph: { title, description: tool.summary, url, type: "website" },
      twitter: { card: "summary_large_image", title, description: tool.summary },
    };
  });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const Impl = TOOL_COMPONENTS[slug];
  return Impl ? <Impl /> : <MockTool slug={slug} />;
}
