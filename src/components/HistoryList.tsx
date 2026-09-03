"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listHistory, deleteHistory, type HistoryEntry } from "@/lib/history";
import { getTool, MALLS } from "@/lib/malls";

/** ツール実行履歴の一覧（この端末の IndexedDB）。設定ページ内で使用。 */
export function HistoryList() {
  const [rows, setRows] = useState<HistoryEntry[]>([]);
  const reload = () => listHistory().then(setRows);
  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-[var(--muted)]">履歴はまだありません。</p>}
      {rows.map((r) => {
        const tool = getTool(r.tool);
        const mall = tool ? MALLS[tool.mall] : null;
        return (
          <div
            key={r.id}
            className="card mall-bar flex items-start justify-between gap-3 p-3"
            style={{ ["--mall" as string]: mall?.color ?? "#5b6472" }}
          >
            <div className="min-w-0">
              <div className="text-xs text-[var(--muted)]">
                {new Date(r.createdAt).toLocaleString()} ·{" "}
                {tool ? (
                  <Link href={`/tools/${tool.slug}/`} className="hover:underline">
                    {tool.name}
                  </Link>
                ) : (
                  r.tool
                )}
              </div>
              <div className="font-medium">{r.title}</div>
              <div className="break-words text-sm text-[var(--muted)]">{r.summary}</div>
            </div>
            <button
              onClick={() => r.id && deleteHistory(r.id).then(reload)}
              className="shrink-0 rounded-md border px-2 py-1 text-xs"
            >
              削除
            </button>
          </div>
        );
      })}
    </div>
  );
}
