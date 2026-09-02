"use client";

import { useState } from "react";

/** 生成テキストの表示＋コピー用ボックス。 */
export function CopyBox({ title, text, rows = 8 }: { title?: string; text: string; rows?: number }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="card p-3">
      <div className="mb-1 flex items-center justify-between">
        {title && <span className="text-sm font-semibold">{title}</span>}
        <button
          onClick={copy}
          className="ml-auto rounded-md border px-2 py-1 text-xs font-semibold"
        >
          {copied ? "コピーしました" : "コピー"}
        </button>
      </div>
      <textarea
        readOnly
        value={text}
        rows={rows}
        className="w-full resize-y rounded-md border bg-[var(--surface-soft)] px-3 py-2 text-sm"
      />
    </div>
  );
}
