"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field } from "@/components/ToolShell";
import { downloadCSV } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

const toKatakana = (s: string) =>
  s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const toHiragana = (s: string) =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const toHankaku = (s: string) =>
  s.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

type Order = "after" | "before" | "both";

export default function KeywordExpand() {
  const [seeds, setSeeds] = useState("キャンプ チェア\nアウトドア テーブル");
  const [mods, setMods] = useState("軽量\n折りたたみ\nコンパクト\nソロ\nファミリー");
  const [order, setOrder] = useState<Order>("after");
  const [space, setSpace] = useState(true);
  const [kana, setKana] = useState(false);
  const [hankaku, setHankaku] = useState(true);

  const [corpus, setCorpus] = useState("");

  const list = useMemo(() => {
    const S = seeds.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const M = mods.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const sep = space ? " " : "";
    const set = new Set<string>();
    for (const s of S) {
      set.add(s);
      for (const m of M) {
        if (order === "after" || order === "both") set.add(`${s}${sep}${m}`);
        if (order === "before" || order === "both") set.add(`${m}${sep}${s}`);
      }
    }
    let arr = [...set];
    if (hankaku) arr = arr.map(toHankaku);
    if (kana) {
      const extra = arr.flatMap((k) => [toHiragana(k), toKatakana(k)]);
      arr = [...new Set([...arr, ...extra])];
    }
    return [...new Set(arr)].sort();
  }, [seeds, mods, order, space, kana, hankaku]);

  const cooc = useMemo(() => {
    if (!corpus.trim()) return [] as { word: string; n: number }[];
    const tokens = corpus.match(/[一-龠々ぁ-んァ-ヴー]{2,}|[A-Za-z][A-Za-z0-9\-]{1,}/g) ?? [];
    const stop = new Set(["こちら", "です", "ます", "して", "この", "その", "から", "など", "ため", "また", "商品", "ページ"]);
    const freq = new Map<string, number>();
    for (const t of tokens) {
      if (stop.has(t)) continue;
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
    return [...freq.entries()]
      .map(([word, n]) => ({ word, n }))
      .filter((x) => x.n >= 2)
      .sort((a, b) => b.n - a.n)
      .slice(0, 40);
  }, [corpus]);

  function exportCsv() {
    downloadCSV("keywords", [["キーワード", "文字数"], ...list.map((k) => [k, k.length])]);
    recordHistory("keyword-expand", `${list.length}件のキーワード生成`, seeds.replace(/\n/g, " / ").slice(0, 60));
  }

  return (
    <ToolShell slug="keyword-expand">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="シードキーワード（1行1件）">
          <textarea
            value={seeds}
            onChange={(e) => setSeeds(e.target.value)}
            rows={5}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="掛け合わせ語（1行1件）" hint="用途・シーン・対象・素材・サイズなど">
          <textarea
            value={mods}
            onChange={(e) => setMods(e.target.value)}
            rows={5}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1">
          <span>付ける位置</span>
          <select
            value={order}
            onChange={(e) => setOrder(e.target.value as Order)}
            className="rounded-md border px-2 py-1"
          >
            <option value="after">後ろ</option>
            <option value="before">前</option>
            <option value="both">前後両方</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={space} onChange={(e) => setSpace(e.target.checked)} />
          スペース区切り
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={kana} onChange={(e) => setKana(e.target.checked)} />
          かな/カナ両方
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={hankaku} onChange={(e) => setHankaku(e.target.checked)} />
          英数を半角に統一
        </label>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">生成結果 {list.length} 件</p>
        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard?.writeText(list.join("\n"))}
            className="rounded-md border px-3 py-1.5 text-sm font-semibold"
          >
            コピー
          </button>
          <button
            onClick={exportCsv}
            className="rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white"
          >
            CSV
          </button>
        </div>
      </div>
      <div className="card max-h-64 overflow-y-auto p-3 text-sm">
        <div className="flex flex-wrap gap-1.5">
          {list.map((k) => (
            <span key={k} className="rounded bg-[var(--surface-soft)] px-2 py-0.5">
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">共起語ぬき出し（任意）</p>
        <p className="mb-2 text-xs text-[var(--muted)]">
          競合ページの本文などを貼り付けると、頻出語（2回以上）を抽出します。
        </p>
        <textarea
          value={corpus}
          onChange={(e) => setCorpus(e.target.value)}
          rows={4}
          placeholder="競合の商品説明文などを貼り付け"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {cooc.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-sm">
            {cooc.map((c) => (
              <span key={c.word} className="rounded border px-2 py-0.5">
                {c.word} <span className="text-[var(--muted)]">{c.n}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
