"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TOOLS, MALLS, MALL_ORDER, getTool, getStatus, type MallId } from "@/lib/malls";
import { ToolIcon } from "@/components/ToolIcon";
import { Glyph } from "@/components/Glyph";
import { StatusBadge, SaveButton } from "@/components/ToolMeta";
import { useMyPage } from "@/lib/mypage";
import {
  listLPs,
  deleteLP,
  duplicateLP,
  renameLP,
  pbBuilderPath,
  type SavedLP,
} from "@/lib/pagebuilderStore";

function ToolCard({ slug, onRemove }: { slug: string; onRemove?: () => void }) {
  const tool = getTool(slug);
  if (!tool) return null;
  const mall = MALLS[tool.mall];
  return (
    <div
      className="card mall-bar flex gap-3 p-3"
      style={{ ["--mall" as string]: mall.color }}
    >
      <ToolIcon name={tool.icon} color={mall.color} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <Link href={`/tools/${tool.slug}/`} className="font-semibold leading-snug hover:underline">
            {tool.name}
          </Link>
          {onRemove ? (
            <button onClick={onRemove} className="rounded border px-1.5 text-xs text-[var(--muted)]">
              ×
            </button>
          ) : (
            <SaveButton slug={tool.slug} compact />
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[11px]" style={{ color: mall.color }}>
            {mall.label}
          </span>
          <StatusBadge status={getStatus(tool)} className="scale-90" />
        </div>
      </div>
    </div>
  );
}

function ToolPicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  const [q, setQ] = useState("");
  const [mall, setMall] = useState<MallId | "all">("all");
  const list = TOOLS.filter(
    (t) =>
      (mall === "all" || t.mall === mall) &&
      (q === "" || t.name.includes(q) || t.summary.includes(q)),
  );
  return (
    <div className="mt-2 rounded-md border p-3">
      <div className="mb-2 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ツール名で絞り込み"
          className="flex-1 rounded-md border px-2 py-1 text-sm"
        />
        <select value={mall} onChange={(e) => setMall(e.target.value as MallId | "all")} className="rounded-md border px-2 py-1 text-sm">
          <option value="all">全モール</option>
          {MALL_ORDER.map((m) => (
            <option key={m} value={m}>
              {MALLS[m].label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
        {list.map((t) => {
          const on = selected.includes(t.slug);
          return (
            <button
              key={t.slug}
              onClick={() => onToggle(t.slug)}
              className={`rounded-md border px-2 py-1 text-xs ${on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "hover:bg-[var(--surface-soft)]"}`}
            >
              <Glyph name={on ? "check" : "plus"} size={12} className="mr-1" />
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SavedLpSection() {
  const [lps, setLps] = useState<SavedLP[] | null>(null);
  const refresh = useCallback(() => {
    listLPs().then(setLps).catch(() => setLps([]));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (lps === null) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-bold">
        作成したLP・トップページ{" "}
        <span className="text-xs font-normal text-[var(--muted)]">（{lps.length}件・この端末に保存）</span>
      </h2>
      {lps.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          ノーコード トップページビルダーの編集画面で「保存リストに保存」すると、ここに一覧表示されます。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lps.map((lp) => {
            const mall = MALLS[lp.target as MallId];
            return (
              <div
                key={lp.id}
                className="card mall-bar flex flex-col gap-2 p-3"
                style={{ ["--mall" as string]: mall?.color }}
              >
                <div className="flex items-start justify-between gap-1">
                  <button
                    onClick={() => {
                      const name = prompt("LP名", lp.name);
                      if (name && name.trim() && name !== lp.name) renameLP(lp.id, name).then(refresh);
                    }}
                    className="min-w-0 flex-1 truncate text-left font-semibold leading-snug hover:underline"
                    title="クリックで名前を変更"
                  >
                    {lp.name}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span style={{ color: mall?.color }}>{mall?.label ?? lp.target}</span>
                  <span className="text-[var(--muted)]">
                    {lp.blocks.length}ブロック ・ {new Date(lp.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-1 flex gap-2">
                  <Link
                    href={pbBuilderPath(lp.target, lp.id)}
                    className="flex-1 rounded-md bg-[var(--brand)] px-3 py-1.5 text-center text-xs font-semibold text-white"
                  >
                    開く
                  </Link>
                  <button
                    onClick={() => duplicateLP(lp.id).then(refresh)}
                    title="複製"
                    className="rounded-md border px-2 py-1.5 text-xs"
                  >
                    <Glyph name="dup" size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`「${lp.name}」を削除しますか？`)) deleteLP(lp.id).then(refresh);
                    }}
                    title="削除"
                    className="rounded-md border px-2 py-1.5 text-xs text-[#bf0000]"
                  >
                    <Glyph name="x" size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function MyPage() {
  const { data, addFolder, renameFolder, deleteFolder, toggleInFolder, moveFolder } = useMyPage();
  const [newName, setNewName] = useState("");
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">マイページ</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        よく使うツールを保存し、用途別フォルダで整理できます（この端末に保存）。
      </p>

      {/* 保存したツール */}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">保存したツール</h2>
        {data.favorites.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            各ツールのページやダッシュボードの「保存」ボタンから追加できます。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.favorites.map((slug) => (
              <ToolCard key={slug} slug={slug} />
            ))}
          </div>
        )}
      </section>

      {/* 作成したLP */}
      <SavedLpSection />

      {/* フォルダ */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-bold">フォルダ</h2>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                addFolder(newName);
                setNewName("");
              }
            }}
            placeholder="例）楽天スーパーSALE準備用 / 新商品登録用 / 週次レポート用"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              if (newName.trim()) {
                addFolder(newName);
                setNewName("");
              }
            }}
            className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            フォルダ作成
          </button>
        </div>

        <div className="space-y-4">
          {data.folders.length === 0 && (
            <p className="text-sm text-[var(--muted)]">まだフォルダがありません。上の入力から作成してください。</p>
          )}
          {data.folders.map((folder, i) => (
            <div key={folder.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={folder.name}
                  onChange={(e) => renameFolder(folder.id, e.target.value)}
                  className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm font-semibold"
                />
                <span className="text-xs text-[var(--muted)]">{folder.slugs.length} ツール</span>
                <button onClick={() => moveFolder(folder.id, -1)} disabled={i === 0} className="rounded border px-2 py-1 text-xs disabled:opacity-30" title="上へ">
                  <Glyph name="arrowUp" size={12} />
                </button>
                <button onClick={() => moveFolder(folder.id, 1)} disabled={i === data.folders.length - 1} className="rounded border px-2 py-1 text-xs disabled:opacity-30" title="下へ">
                  <Glyph name="arrowDown" size={12} />
                </button>
                <button
                  onClick={() => setOpenPicker(openPicker === folder.id ? null : folder.id)}
                  className="rounded-md border px-3 py-1 text-xs font-semibold"
                >
                  {openPicker === folder.id ? "閉じる" : "+ ツールを追加/削除"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`フォルダ「${folder.name}」を削除しますか？`)) deleteFolder(folder.id);
                  }}
                  className="rounded-md border px-3 py-1 text-xs text-[#bf0000]"
                >
                  削除
                </button>
              </div>

              {openPicker === folder.id && (
                <ToolPicker selected={folder.slugs} onToggle={(slug) => toggleInFolder(folder.id, slug)} />
              )}

              {folder.slugs.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {folder.slugs.map((slug) => (
                    <ToolCard key={slug} slug={slug} onRemove={() => toggleInFolder(folder.id, slug)} />
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">「+ ツールを追加/削除」から入れてください。</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
