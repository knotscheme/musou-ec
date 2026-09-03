"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ToolShell, Field } from "@/components/ToolShell";
import { Glyph } from "@/components/Glyph";
import { triggerDownload } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

interface Item {
  id: string;
  url: string;
  img: HTMLImageElement;
  w: number;
  h: number;
  name: string;
}

type Dir = "vertical" | "horizontal";
type Align = "start" | "center" | "end";

const rid = () => Math.random().toString(36).slice(2, 9);

export default function ImageMerge() {
  const [items, setItems] = useState<Item[]>([]);
  const [dir, setDir] = useState<Dir>("vertical");
  const [gap, setGap] = useState(0);
  const [gapColor, setGapColor] = useState("#ffffff");
  const [uniform, setUniform] = useState(true);
  const [align, setAlign] = useState<Align>("center");
  const [fmt, setFmt] = useState<"png" | "jpeg">("png");
  const [quality, setQuality] = useState(0.9);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const previewRef = useRef<HTMLCanvasElement>(null);

  const add = useCallback(async (files: FileList | File[] | null | undefined) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    const loaded = await Promise.all(
      list.map(
        (file) =>
          new Promise<Item | null>((res) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () =>
              res({ id: rid(), url, img, w: img.naturalWidth, h: img.naturalHeight, name: file.name });
            img.onerror = () => {
              URL.revokeObjectURL(url);
              res(null);
            };
            img.src = url;
          }),
      ),
    );
    setItems((cur) => [...cur, ...(loaded.filter(Boolean) as Item[])]);
  }, []);

  useEffect(
    () => () => {
      // アンマウント時に URL を解放
      setItems((cur) => {
        cur.forEach((i) => URL.revokeObjectURL(i.url));
        return cur;
      });
    },
    [],
  );

  const move = (i: number, d: -1 | 1) =>
    setItems((cur) => {
      const j = i + d;
      if (j < 0 || j >= cur.length) return cur;
      const n = [...cur];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const remove = (id: string) =>
    setItems((cur) => {
      const t = cur.find((x) => x.id === id);
      if (t) URL.revokeObjectURL(t.url);
      return cur.filter((x) => x.id !== id);
    });

  /** 結合結果を canvas に描画。preview=true のときはプレビュー用に縮小。 */
  const compose = useCallback(
    (canvas: HTMLCanvasElement): { w: number; h: number } => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !items.length) return { w: 0, h: 0 };
      const vert = dir === "vertical";

      // 各画像のサイズ（uniform なら長さ方向をそろえる）
      const base = uniform
        ? vert
          ? Math.max(...items.map((i) => i.w))
          : Math.max(...items.map((i) => i.h))
        : 0;
      const sized = items.map((i) => {
        if (!uniform) return { img: i.img, w: i.w, h: i.h };
        if (vert) {
          const w = base;
          return { img: i.img, w, h: Math.round((i.h * w) / i.w) };
        }
        const h = base;
        return { img: i.img, w: Math.round((i.w * h) / i.h), h };
      });

      const g = Math.max(0, Math.round(gap));
      let cw: number;
      let ch: number;
      if (vert) {
        cw = Math.max(...sized.map((s) => s.w));
        ch = sized.reduce((a, s) => a + s.h, 0) + g * (sized.length - 1);
      } else {
        cw = sized.reduce((a, s) => a + s.w, 0) + g * (sized.length - 1);
        ch = Math.max(...sized.map((s) => s.h));
      }
      canvas.width = cw;
      canvas.height = ch;

      ctx.fillStyle = gapColor;
      ctx.fillRect(0, 0, cw, ch);

      let pos = 0;
      for (const s of sized) {
        if (vert) {
          const x = align === "start" ? 0 : align === "end" ? cw - s.w : Math.round((cw - s.w) / 2);
          ctx.drawImage(s.img, x, pos, s.w, s.h);
          pos += s.h + g;
        } else {
          const y = align === "start" ? 0 : align === "end" ? ch - s.h : Math.round((ch - s.h) / 2);
          ctx.drawImage(s.img, pos, y, s.w, s.h);
          pos += s.w + g;
        }
      }
      return { w: cw, h: ch };
    },
    [items, dir, gap, gapColor, uniform, align],
  );

  // ライブプレビュー
  const [outSize, setOutSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (previewRef.current) setOutSize(compose(previewRef.current));
  }, [compose]);

  async function exportImage() {
    if (!items.length) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      compose(canvas);
      const type = fmt === "png" ? "image/png" : "image/jpeg";
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("生成失敗"))), type, fmt === "jpeg" ? quality : undefined),
      );
      triggerDownload(blob, `merged-${Date.now()}.${fmt === "png" ? "png" : "jpg"}`);
      recordHistory("image-studio", `画像を${items.length}枚結合`, `${outSize.w}×${outSize.h}px / ${fmt.toUpperCase()}`);
      setMsg(`書き出しました（${outSize.w}×${outSize.h}px）。`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell slug="image-studio">
      <p className="text-xs text-[var(--muted)]">
        複数画像を一括で読み込み、順番を入れ替え、つなぎ目に余白を入れて1枚に結合します。
        商品説明用の縦長画像づくりに。すべてブラウザ内処理（外部送信なし）。
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center transition ${
          over ? "border-[var(--brand)] bg-[var(--surface-soft)]" : "text-[var(--muted)]"
        }`}
      >
        <Glyph name="upload" size={24} />
        <span className="text-sm font-semibold">画像をドラッグ&ドロップ / クリックで選択（複数可）</span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-1"
          onChange={(e) => add(e.target.files)}
        />
      </label>

      {items.length > 0 && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            {/* 並び替えリスト */}
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold text-[var(--muted)]">
                順番（{items.length}枚・{dir === "vertical" ? "上から下へ" : "左から右へ"}）
              </p>
              {items.map((it, i) => (
                <div key={it.id} className="flex items-center gap-2 rounded-md border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt="" className="h-12 w-12 rounded object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{it.name}</div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {it.w}×{it.h}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded border px-1.5 py-1 text-xs disabled:opacity-30"
                      title="前へ"
                    >
                      <Glyph name="arrowUp" size={12} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === items.length - 1}
                      className="rounded border px-1.5 py-1 text-xs disabled:opacity-30"
                      title="次へ"
                    >
                      <Glyph name="arrowDown" size={12} />
                    </button>
                    <button
                      onClick={() => remove(it.id)}
                      className="rounded border px-1.5 py-1 text-xs text-[#bf0000]"
                      title="削除"
                    >
                      <Glyph name="x" size={12} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  items.forEach((x) => URL.revokeObjectURL(x.url));
                  setItems([]);
                }}
                className="text-[11px] text-[var(--muted)] underline"
              >
                すべてクリア
              </button>
            </div>

            {/* プレビュー */}
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold text-[var(--muted)]">
                プレビュー（出力 {outSize.w}×{outSize.h}px）
              </p>
              <div className="max-h-[520px] overflow-auto rounded-lg border bg-[#f3f3f3] p-3">
                <canvas
                  ref={previewRef}
                  className="mx-auto block h-auto max-w-full"
                  style={{ background: gapColor }}
                />
              </div>
            </div>
          </div>

          {/* 設定 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="結合方向">
              <select
                value={dir}
                onChange={(e) => setDir(e.target.value as Dir)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="vertical">縦（上下に連結）</option>
                <option value="horizontal">横（左右に連結）</option>
              </select>
            </Field>
            <Field label={`つなぎ目の余白 ${gap}px`}>
              <input
                type="range"
                min={0}
                max={200}
                value={gap}
                onChange={(e) => setGap(+e.target.value)}
                className="w-full"
              />
            </Field>
            <Field label="余白・背景の色">
              <input
                type="color"
                value={gapColor}
                onChange={(e) => setGapColor(e.target.value)}
                className="h-9 w-full rounded border"
              />
            </Field>
            <Field label={dir === "vertical" ? "幅をそろえる" : "高さをそろえる"} hint="オフだと元サイズのまま中央寄せ">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={uniform} onChange={(e) => setUniform(e.target.checked)} />
                <span>そろえる（最大サイズに合わせて拡縮）</span>
              </label>
            </Field>
            <Field label="そろえない時の位置">
              <select
                value={align}
                onChange={(e) => setAlign(e.target.value as Align)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="center">中央</option>
                <option value="start">{dir === "vertical" ? "左" : "上"}</option>
                <option value="end">{dir === "vertical" ? "右" : "下"}</option>
              </select>
            </Field>
            <Field label="出力形式">
              <div className="flex gap-2">
                <select
                  value={fmt}
                  onChange={(e) => setFmt(e.target.value as "png" | "jpeg")}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  <option value="png">PNG（余白透過なし）</option>
                  <option value="jpeg">JPEG</option>
                </select>
                {fmt === "jpeg" && (
                  <input
                    type="range"
                    min={0.5}
                    max={1}
                    step={0.05}
                    value={quality}
                    onChange={(e) => setQuality(+e.target.value)}
                    className="flex-1"
                    title={`画質 ${quality.toFixed(2)}`}
                  />
                )}
              </div>
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportImage}
              disabled={busy}
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "書き出し中…" : "結合して書き出し"}
            </button>
            {msg && <span className="text-sm text-[var(--brand)]">{msg}</span>}
          </div>
        </>
      )}
    </ToolShell>
  );
}
