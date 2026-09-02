"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listHistory, deleteHistory, type HistoryEntry } from "@/lib/history";
import { getTool, MALLS } from "@/lib/malls";
import { useI18n } from "@/lib/i18n";

export default function HistoryPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<HistoryEntry[]>([]);

  const reload = () => listHistory().then(setRows);
  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">{t("nav_history")}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        実行結果はこの端末の IndexedDB に保存されています（owner 単位）。
      </p>

      <div className="mt-6 space-y-2">
        {rows.length === 0 && <p className="text-[var(--muted)]">履歴はまだありません。</p>}
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
                <div className="text-sm text-[var(--muted)] break-words">{r.summary}</div>
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
    </div>
  );
}
