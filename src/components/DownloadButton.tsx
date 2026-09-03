"use client";

import { useRef, useState, type ReactNode } from "react";

/** 押下後に「✓ ダウンロード済み」を数秒表示し、その間は無効化して連打を防ぐボタン。 */
export function DownloadButton({
  onDownload,
  children,
  className = "",
}: {
  onDownload: () => void;
  children: ReactNode;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  return (
    <button
      type="button"
      onClick={() => {
        onDownload();
        setDone(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(false), 2000);
      }}
      disabled={done}
      className={`rounded-md border px-3 py-2 text-sm font-semibold transition active:scale-95 disabled:cursor-default disabled:opacity-100 ${
        done ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "text-[var(--brand)] hover:bg-[var(--surface-soft)]"
      } ${className}`}
    >
      {done ? "✓ ダウンロード済み" : children}
    </button>
  );
}
