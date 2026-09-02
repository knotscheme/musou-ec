import { TOOLS } from "@/lib/malls";
import { MockTool } from "@/components/MockTool";
import { TOOL_COMPONENTS } from "@/tools/registry";

export function generateStaticParams() {
  // 外部リンクのツール（external）は自前のページを持たない
  return TOOLS.filter((t) => !t.external).map((t) => ({ slug: t.slug }));
}

export const dynamicParams = false;

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const Impl = TOOL_COMPONENTS[slug];
  return Impl ? <Impl /> : <MockTool slug={slug} />;
}
