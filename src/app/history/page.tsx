"use client";

import { useEffect } from "react";
import Link from "next/link";

// 実行履歴は「設定」ページ内に統合。旧URLはそちらへ誘導する。
export default function HistoryPage() {
  useEffect(() => {
    window.location.replace("../settings/#history");
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-[var(--muted)]">
        実行履歴は「設定」ページに移動しました。
        <Link href="/settings/#history" className="ml-1 text-[var(--brand)] underline">
          設定を開く
        </Link>
      </p>
    </div>
  );
}
