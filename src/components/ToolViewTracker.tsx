"use client";

import { useEffect, useRef } from "react";

import { trackToolView } from "@/lib/analytics";

/**
 * tools/[slug]/page.tsx(全ツール共通の動的ルート)にだけ組み込む、ツールアクセス計測用の
 * 見えないコンポーネント。ここ1箇所に仕込むことで、今後malls.tsのTOOLSに新しいツールを
 * 追加しても、個別の計測コード追加なしに自動的にアクセス計測の対象になる。
 */
export function ToolViewTracker({ slug }: { slug: string }) {
  const sentRef = useRef<string | null>(null);

  useEffect(() => {
    if (sentRef.current === slug) return;
    sentRef.current = slug;
    trackToolView(slug);
  }, [slug]);

  return null;
}
