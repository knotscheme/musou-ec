"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import rawVideos from "@/data/videos.json";
import { MALLS, MALL_ORDER, getTool, type MallId } from "@/lib/malls";
import { Glyph } from "@/components/Glyph";
import {
  useLearn,
  PURPOSE_CATEGORIES,
  STATUS_META,
  type LearnVideo,
  type WatchStatus,
} from "@/lib/learn";

const VIDEOS = rawVideos as LearnVideo[];
const fmtDate = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ja-JP");
};
const fmtViews = (n?: number) => {
  const v = n ?? 0;
  if (v >= 10000) return `${(v / 10000).toFixed(v >= 100000 ? 0 : 1)}万回`;
  return `${v.toLocaleString("ja-JP")}回`;
};
type SortKey = "new" | "views";

export default function LearnPage() {
  const [selected, setSelected] = useState<string | null>(null);

  // ?v=<videoId> と同期（静的エクスポートのためクライアント側で処理）
  useEffect(() => {
    const sync = () => setSelected(new URLSearchParams(window.location.search).get("v"));
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const open = (id: string | null) => {
    const url = id ? `?v=${encodeURIComponent(id)}` : window.location.pathname;
    window.history.pushState(null, "", url);
    setSelected(id);
    window.scrollTo({ top: 0 });
  };

  const current = selected ? VIDEOS.find((v) => v.videoId === selected) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-1 text-xs text-[var(--muted)]">
        <Link href="/" className="hover:underline">
          ダッシュボード
        </Link>{" "}
        / 学ぶ
      </div>
      <h1 className="text-2xl font-bold">学ぶ</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        EC運営の解説動画を、プラットフォーム・目的で絞って視聴。動画ごとに視聴状況とメモを
        この端末に保存でき、関連ツールへそのまま移動できます。
      </p>

      {current ? (
        <VideoDetail video={current} onBack={() => open(null)} />
      ) : (
        <VideoList onOpen={open} />
      )}
    </div>
  );
}

/* ───────────────────── 一覧（ポータル） ───────────────────── */

const PAGE = 24;

function VideoList({ onOpen }: { onOpen: (id: string) => void }) {
  const { get } = useLearn();
  const [platform, setPlatform] = useState<MallId | "all" | "fav">("all");
  const [purpose, setPurpose] = useState<string | "all">("all");
  const [sort, setSort] = useState<SortKey>("new");
  const [limit, setLimit] = useState(PAGE);

  const list = useMemo(() => {
    const v = VIDEOS.filter((x) => {
      if (platform === "fav") return get(x.videoId).fav;
      if (platform !== "all" && x.platform !== platform) return false;
      if (purpose !== "all" && x.category !== purpose) return false;
      return true;
    });
    return [...v].sort((a, b) =>
      sort === "views"
        ? (b.viewCount ?? 0) - (a.viewCount ?? 0)
        : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }, [platform, purpose, sort, get]);

  // 絞り込み・並び替えを変えたら先頭に戻す
  useEffect(() => setLimit(PAGE), [platform, purpose, sort]);
  const shown = list.slice(0, limit);

  const platformTabs: { key: MallId | "all"; label: string; color?: string }[] = [
    { key: "all", label: "すべて" },
    ...MALL_ORDER.map((m) => ({ key: m, label: MALLS[m].label, color: MALLS[m].color })),
  ];

  return (
    <div className="mt-5">
      {/* スクロール時に上部固定するフィルタバー（ダッシュボードのモールタブと同じ挙動） */}
      <div className="sticky top-0 z-20 mb-4 -mx-4 space-y-1.5 border-b bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] px-4 py-2 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:p-2 lg:top-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {platformTabs.map((t) => {
          const on = platform === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setPlatform(t.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                on ? "text-white" : "bg-[var(--surface-soft)] text-[var(--foreground)]"
              }`}
              style={on ? { background: t.color ?? "var(--brand)" } : undefined}
            >
              {t.label}
            </button>
          );
        })}
        <button
          onClick={() => setPlatform("fav")}
          className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
            platform === "fav" ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "text-[var(--muted)]"
          }`}
        >
          <Glyph name="bookmark" size={12} filled />
          マイリスト
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", ...PURPOSE_CATEGORIES] as const).map((p) => {
          const on = purpose === p;
          return (
            <button
              key={p}
              onClick={() => setPurpose(p)}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : ""
              }`}
            >
              {p === "all" ? "目的：すべて" : p}
            </button>
          );
        })}
        <span className="ml-auto inline-flex overflow-hidden rounded-md border text-xs font-semibold">
          {(
            [
              ["new", "新着順"],
              ["views", "再生数順"],
            ] as [SortKey, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={`px-2.5 py-1 ${sort === k ? "bg-[var(--brand)] text-white" : ""}`}
            >
              {label}
            </button>
          ))}
        </span>
      </div>
      </div>

      {list.length === 0 ? (
        <div className="card p-6 text-sm text-[var(--muted)]">
          {VIDEOS.length === 0 ? (
            <>
              まだ動画が登録されていません。<code>scripts/config/channels.json</code> に
              YouTubeチャンネルを追加すると、毎日自動で取り込まれます。
            </>
          ) : (
            "この条件に一致する動画はありません。"
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((v) => (
              <VideoCard key={v.videoId} video={v} onOpen={() => onOpen(v.videoId)} />
            ))}
          </div>
          {limit < list.length && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setLimit((n) => n + PAGE)}
                className="rounded-md border px-5 py-2 text-sm font-semibold"
              >
                さらに表示（残り {list.length - limit} 本）
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VideoCard({ video, onOpen }: { video: LearnVideo; onOpen: () => void }) {
  const { get, toggleFav } = useLearn();
  const p = get(video.videoId);
  const mall = MALLS[video.platform as MallId] ?? MALLS.common;
  const st = STATUS_META[p.status];

  return (
    <div
      className="card mall-bar flex flex-col overflow-hidden p-0 [contain-intrinsic-size:auto_320px] [content-visibility:auto]"
      style={{ ["--mall" as string]: mall.color }}
    >
      <button onClick={onOpen} className="relative block text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnailUrl}
          alt=""
          loading="lazy"
          className="aspect-video w-full object-cover"
        />
        <span
          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: st.color }}
        >
          {st.label}
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center gap-2 text-[11px]">
          <span style={{ color: mall.color }}>{mall.label}</span>
          {video.category && <span className="text-[var(--muted)]">・{video.category}</span>}
        </div>
        <button onClick={onOpen} className="line-clamp-2 text-left text-sm font-semibold leading-snug hover:underline">
          {video.title}
        </button>
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-[11px] text-[var(--muted)]">
            {fmtViews(video.viewCount)} ・ {fmtDate(video.publishedAt)}
          </span>
          <button
            onClick={() => toggleFav(video.videoId)}
            title={p.fav ? "マイリストから外す" : "マイリストに保存"}
            className={`rounded p-1 ${p.fav ? "text-[var(--brand)]" : "text-[var(--muted)]"}`}
          >
            <Glyph name="bookmark" size={14} filled={p.fav} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── 詳細（プレイヤー） ───────────────────── */

function VideoDetail({ video, onBack }: { video: LearnVideo; onBack: () => void }) {
  const { get, setStatus, setNote, toggleFav } = useLearn();
  const p = get(video.videoId);
  const mall = MALLS[video.platform as MallId] ?? MALLS.common;
  const relatedTool = video.relatedToolPath
    ? getTool(video.relatedToolPath.replace(/^\/tools\//, "").replace(/\/$/, ""))
    : undefined;

  // 視聴を開くと未視聴 → 視聴中へ
  useEffect(() => {
    if (get(video.videoId).status === "unwatched") setStatus(video.videoId, "watching");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.videoId]);

  return (
    <div className="mt-4">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-[var(--brand)]">
        <Glyph name="arrowUp" size={13} className="-rotate-90" /> 一覧へ戻る
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="overflow-hidden rounded-xl border bg-black">
            <iframe
              title={video.title}
              src={`https://www.youtube.com/embed/${video.videoId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="aspect-video w-full"
            />
          </div>
          <h2 className="mt-3 text-lg font-bold leading-snug">{video.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span style={{ color: mall.color }}>{mall.label}</span>
            {video.category && <span>・{video.category}</span>}
            {video.channelName && <span>・{video.channelName}</span>}
            <span>・{fmtViews(video.viewCount)}</span>
            <span>・{fmtDate(video.publishedAt)}</span>
            <a
              href={`https://www.youtube.com/watch?v=${video.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--brand)]"
            >
              <Glyph name="external" size={11} /> YouTubeで開く
            </a>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-3">
            <p className="mb-1.5 text-xs font-semibold text-[var(--muted)]">視聴ステータス</p>
            <div className="flex gap-1.5">
              {(Object.keys(STATUS_META) as WatchStatus[]).map((s) => {
                const on = p.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(video.videoId, s)}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                      on ? "text-white" : ""
                    }`}
                    style={on ? { background: STATUS_META[s].color, borderColor: STATUS_META[s].color } : undefined}
                  >
                    {STATUS_META[s].label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => toggleFav(video.videoId)}
              className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                p.fav ? "border-[var(--brand)] text-[var(--brand)]" : "text-[var(--muted)]"
              }`}
            >
              <Glyph name="bookmark" size={13} filled={p.fav} />
              {p.fav ? "マイリストに保存済み" : "マイリストに保存"}
            </button>
          </div>

          {relatedTool && (
            <Link
              href={video.relatedToolPath}
              className="flex items-center gap-3 rounded-xl border p-3 transition hover:shadow-md"
              style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 8%, transparent)" }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
                <Glyph name="external" size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-[var(--muted)]">この内容をツールで実践</span>
                <span className="block truncate text-sm font-bold">{relatedTool.name}</span>
              </span>
            </Link>
          )}

          <div className="card p-3">
            <p className="mb-1.5 text-xs font-semibold text-[var(--muted)]">学習メモ（この端末に自動保存）</p>
            <textarea
              value={p.note}
              onChange={(e) => setNote(video.videoId, e.target.value)}
              rows={10}
              placeholder="ポイント・自店に当てはめたときのToDo など"
              className="w-full resize-y rounded-md border px-2 py-1.5 text-sm leading-relaxed"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
