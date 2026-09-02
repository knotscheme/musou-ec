"use client";

import { useEffect, useState } from "react";
import { STATUS_LABEL, STATUS_COLOR, type ToolStatus } from "@/lib/malls";
import { getVotes, toggleVote } from "@/lib/wishlist";
import { useMyPage } from "@/lib/mypage";

/**
 * ツールをマイページに保存するボタン（トグル）。
 * compact=true でアイコンのみ（カードの隅など）。
 */
export function SaveButton({
  slug,
  compact = false,
}: {
  slug: string;
  compact?: boolean;
}) {
  const { isFavorite, toggleFavorite } = useMyPage();
  const on = isFavorite(slug);

  const icon = (
    <svg width={16} height={16} viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </svg>
  );

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(slug);
  };

  if (compact) {
    return (
      <button
        onClick={handle}
        title={on ? "マイページから外す" : "マイページに保存"}
        aria-pressed={on}
        className="inline-flex items-center justify-center rounded-md p-1 hover:bg-[var(--surface-soft)]"
        style={{ color: on ? "var(--brand)" : "var(--muted)" }}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      onClick={handle}
      aria-pressed={on}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
        on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "hover:bg-[var(--surface-soft)]"
      }`}
    >
      {icon}
      {on ? "保存済み" : "保存"}
    </button>
  );
}

export function StatusBadge({ status, className = "" }: { status: ToolStatus; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ background: `${STATUS_COLOR[status]}1f`, color: STATUS_COLOR[status] }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * 「あったらいいな」投票ボタン。開発中ツールの優先度を集める。
 * voteId は `tool:<slug>` や `idea:<id>` の形式。
 */
export function VoteButton({
  voteId,
  size = "sm",
  onChange,
}: {
  voteId: string;
  size?: "sm" | "md";
  onChange?: (active: boolean, count: number) => void;
}) {
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    getVotes().then((v) => {
      setVoted(Boolean(v[voteId]));
      setCount(v[voteId] ?? 0);
    });
  }, [voteId]);

  async function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const v = await toggleVote(voteId);
    const active = Boolean(v[voteId]);
    setVoted(active);
    setCount(v[voteId] ?? 0);
    onChange?.(active, v[voteId] ?? 0);
  }

  const pad = size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs";
  return (
    <button
      onClick={handle}
      title="このツールを優先してほしい"
      className={`inline-flex items-center gap-1 rounded-md border font-semibold transition ${pad} ${
        voted
          ? "border-[var(--brand)] bg-[var(--brand)] text-white"
          : "hover:bg-[var(--surface-soft)]"
      }`}
    >
      <span>▲</span>
      <span>{voted ? "リクエスト済" : "欲しい"}</span>
      {count > 0 && <span className="opacity-80">{count}</span>}
    </button>
  );
}
