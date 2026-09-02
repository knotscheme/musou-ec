"use client";

import { useMemo, useState } from "react";
import { Stat } from "@/components/ToolShell";

export interface CheckItem {
  id: string;
  label: string;
  /** 重み（既定1） */
  weight?: number;
  /** 未チェック時のアドバイス */
  advice?: string;
}

export function Checklist({
  items,
  onScore,
}: {
  items: CheckItem[];
  onScore?: (score: number, checkedIds: string[]) => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const total = useMemo(() => items.reduce((s, i) => s + (i.weight ?? 1), 0), [items]);
  const got = useMemo(
    () => items.reduce((s, i) => s + (checked[i.id] ? (i.weight ?? 1) : 0), 0),
    [items, checked],
  );
  const score = total > 0 ? Math.round((got / total) * 100) : 0;
  const tone = score >= 80 ? "ok" : score >= 50 ? "warn" : "bad";

  function toggle(id: string) {
    setChecked((c) => {
      const next = { ...c, [id]: !c[id] };
      const ids = items.filter((i) => next[i.id]).map((i) => i.id);
      onScore?.(
        Math.round(
          (items.reduce((s, i) => s + (next[i.id] ? (i.weight ?? 1) : 0), 0) / total) * 100,
        ),
        ids,
      );
      return next;
    });
  }

  const missing = items.filter((i) => !checked[i.id] && i.advice);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="達成スコア" value={`${score} / 100`} tone={tone} />
        <Stat label="チェック済" value={`${items.filter((i) => checked[i.id]).length} / ${items.length}`} />
        <Stat label="判定" value={score >= 80 ? "良好" : score >= 50 ? "要改善" : "危険"} tone={tone} />
      </div>

      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm hover:bg-[var(--surface-soft)]">
              <input
                type="checkbox"
                checked={Boolean(checked[i.id])}
                onChange={() => toggle(i.id)}
                className="mt-0.5"
              />
              <span className="flex-1">
                {i.label}
                {(i.weight ?? 1) > 1 && (
                  <span className="ml-1 text-[11px] text-[var(--muted)]">×{i.weight}</span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {missing.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-sm font-semibold">改善アドバイス（未達項目）</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {missing.map((i) => (
              <li key={i.id}>{i.advice}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
