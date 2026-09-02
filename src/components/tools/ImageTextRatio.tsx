"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ToolShell, Field, Stat } from "@/components/ToolShell";
import { Glyph } from "@/components/Glyph";
import { downloadCSV } from "@/lib/csv";
import { analyzeTextRatio, type RatioResult } from "@/lib/textratio";
import { recordHistory } from "@/lib/history";

interface Item {
  name: string;
  url: string;
  ratio: number;
  result: RatioResult;
}

const THRESHOLD = 0.2; // 楽天サムネイル（1枚目）の目安 20%
type Tone = "bad" | "warn" | "ok";
const toneOf = (r: number): Tone => (r > THRESHOLD ? "bad" : r > THRESHOLD * 0.8 ? "warn" : "ok");
const TONE_BG: Record<Tone, string> = { bad: "#bf000022", warn: "#a1701c22", ok: "#1a8a5a22" };
const TONE_FG: Record<Tone, string> = { bad: "#bf0000", warn: "#a1701c", ok: "#1a8a5a" };
const TONE_LABEL: Record<Tone, string> = { bad: "NG（20%超）", warn: "要注意", ok: "OK" };

type SortKey = "ratio" | "name";
type FilterKey = "all" | Tone;

export default function ImageTextRatio() {
  const [sensitivity, setSensitivity] = useState(50);
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sort, setSort] = useState<SortKey>("ratio");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filesRef = useRef<File[]>([]);

  async function analyze(files: File[]) {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    filesRef.current = imgs;
    setExpanded(null);
    setItems((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setProgress({ done: 0, total: imgs.length });
    const out: Item[] = [];
    for (const file of imgs) {
      try {
        const { img, url } = await loadImage(file);
        const result = analyzeTextRatio(img, { sensitivity });
        out.push({ name: file.name, url, ratio: result.ratio, result });
      } catch {
        /* 読み込めない画像はスキップ */
      }
      setProgress({ done: out.length, total: imgs.length });
    }
    setItems(out);
    setProgress(null);
    if (out.length) {
      const over = out.filter((i) => i.ratio > THRESHOLD).length;
      recordHistory(
        "image-text-ratio",
        `${out.length}枚を一括判定`,
        `NG ${over}枚 / 最大 ${(Math.max(...out.map((i) => i.ratio)) * 100).toFixed(0)}%`,
      );
    }
  }

  // 感度を変えたら同じ画像で再解析
  useEffect(() => {
    if (filesRef.current.length) analyze(filesRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensitivity]);

  useEffect(
    () => () => {
      filesRef.current = [];
    },
    [],
  );

  const counts = useMemo(() => {
    const c = { all: items.length, bad: 0, warn: 0, ok: 0 };
    for (const it of items) c[toneOf(it.ratio)]++;
    return c;
  }, [items]);

  const view = useMemo(() => {
    let v = items;
    if (filter !== "all") v = v.filter((i) => toneOf(i.ratio) === filter);
    v = [...v].sort((a, b) => (sort === "ratio" ? b.ratio - a.ratio : a.name.localeCompare(b.name)));
    return v;
  }, [items, filter, sort]);

  function exportCsv() {
    const rows: (string | number)[][] = [["ファイル名", "テキスト占有率(%)", "判定", "感度"]];
    for (const it of [...items].sort((a, b) => b.ratio - a.ratio)) {
      rows.push([it.name, (it.ratio * 100).toFixed(1), TONE_LABEL[toneOf(it.ratio)], sensitivity]);
    }
    downloadCSV(`thumbnail-text-ratio_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <ToolShell slug="image-text-ratio">
      <div className="card p-4 text-sm text-[var(--muted)]">
        楽天RMSの「1枚ずつ」のチェックと違い、<strong>出品前にフォルダごとまとめてプリフライト</strong>できます。
        楽天サムネイル（1枚目）は<strong>テキスト占有面積20%以下</strong>が目安。画像はブラウザ内だけで解析され、外部送信はありません。
        エッジ密度・局所コントラスト・明暗の二極性からの<strong>推定値</strong>のため、最終判断は目視で行ってください。
      </div>

      <Field label={`検出感度 ${sensitivity}`} hint="上げるとテキストを多めに拾います（全画像に即時反映）">
        <input
          type="range"
          min={0}
          max={100}
          value={sensitivity}
          onChange={(e) => setSensitivity(+e.target.value)}
          className="w-full"
        />
      </Field>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          analyze(Array.from(e.dataTransfer.files ?? []));
        }}
        className={`card flex cursor-pointer flex-col items-center gap-2 border-dashed p-8 text-center transition ${
          dragOver ? "border-[var(--brand)] bg-[var(--surface-soft)]" : ""
        }`}
      >
        <Glyph name="upload" size={26} className="text-[var(--muted)]" />
        <span className="text-sm font-semibold">画像をまとめてドラッグ&ドロップ</span>
        <span className="text-xs text-[var(--muted)]">または下のボタンで複数選択（枚数制限なし・すべて端末内処理）</span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => analyze(Array.from(e.target.files ?? []))}
          className="mt-1"
        />
      </label>

      {progress && (
        <div className="space-y-1">
          <p className="text-sm">
            解析中… {progress.done} / {progress.total} 枚
          </p>
          <div className="h-2 overflow-hidden rounded bg-[var(--surface-soft)]">
            <div
              className="h-full bg-[var(--brand)] transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="判定枚数" value={`${counts.all}`} />
            <Stat label="NG（20%超）" value={`${counts.bad}`} tone={counts.bad ? "bad" : "ok"} />
            <Stat label="要注意（16〜20%）" value={`${counts.warn}`} tone={counts.warn ? "warn" : "ok"} />
            <Stat label="最大占有率" value={`${(Math.max(...items.map((i) => i.ratio)) * 100).toFixed(0)}%`} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["all", `すべて ${counts.all}`],
                ["bad", `NG ${counts.bad}`],
                ["warn", `要注意 ${counts.warn}`],
                ["ok", `OK ${counts.ok}`],
              ] as [FilterKey, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  filter === k ? "border-[var(--brand)] bg-[var(--brand)] text-white" : ""
                }`}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setSort(sort === "ratio" ? "name" : "ratio")}
                className="rounded-md border px-3 py-1 text-xs font-semibold"
              >
                並び替え：{sort === "ratio" ? "占有率が高い順" : "ファイル名順"}
              </button>
              <button
                onClick={exportCsv}
                className="rounded-md border px-3 py-1 text-xs font-semibold"
              >
                <Glyph name="download" size={12} className="mr-1" />
                CSV出力
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs text-[var(--muted)]">
                <tr>
                  <th className="w-16 px-3 py-2 text-left">サムネ</th>
                  <th className="px-3 py-2 text-left">ファイル名</th>
                  <th className="w-40 px-3 py-2 text-left">占有率</th>
                  <th className="w-24 px-3 py-2 text-left">判定</th>
                  <th className="w-16 px-3 py-2 text-right">詳細</th>
                </tr>
              </thead>
              <tbody>
                {view.map((it) => {
                  const tone = toneOf(it.ratio);
                  const pct = it.ratio * 100;
                  const open = expanded === it.name;
                  return (
                    <FragmentRow key={it.name}>
                      <tr className="border-t">
                        <td className="px-3 py-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={it.url} alt="" className="h-10 w-10 rounded object-cover" />
                        </td>
                        <td className="max-w-[1px] truncate px-3 py-2 font-medium">{it.name}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded bg-[var(--surface-soft)]">
                              <div
                                className="h-full"
                                style={{ width: `${Math.min(100, pct)}%`, background: TONE_FG[tone] }}
                              />
                            </div>
                            <span className="w-9 text-right text-xs font-bold" style={{ color: TONE_FG[tone] }}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}
                          >
                            {TONE_LABEL[tone]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setExpanded(open ? null : it.name)}
                            className="rounded border px-2 py-0.5 text-xs"
                          >
                            {open ? "閉じる" : "見る"}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-t bg-[var(--surface-soft)]">
                          <td colSpan={5} className="px-3 py-3">
                            <div className="mx-auto max-w-sm">
                              <Overlay item={it} />
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                赤い部分がテキストと推定した領域です。
                                {it.ratio > THRESHOLD
                                  ? "文字量を減らすか、余白・配置を見直してください。"
                                  : "20%以内の見込みです。"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </FragmentRow>
                  );
                })}
                {view.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                      この条件に一致する画像はありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ToolShell>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Overlay({ item }: { item: Item }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const W = 320;
      const H = Math.round((img.height / img.width) * W);
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, W, H);
      const { cols, rows, textCells } = item.result;
      const cw = W / cols;
      const ch = H / rows;
      ctx.fillStyle = "rgba(191,0,0,0.35)";
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          if (textCells[cy * cols + cx]) ctx.fillRect(cx * cw, cy * ch, cw, ch);
        }
      }
    };
    img.src = item.url;
  }, [item]);
  return <canvas ref={ref} className="w-full rounded" />;
}

function loadImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => res({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("load failed"));
    };
    img.src = url;
  });
}
