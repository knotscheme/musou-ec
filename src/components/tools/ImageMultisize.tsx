"use client";

import { useState } from "react";
import { ToolShell, Field } from "@/components/ToolShell";
import { triggerDownload } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

interface Preset {
  id: string;
  label: string;
  w: number;
  h: number;
}
const PRESETS: Preset[] = [
  { id: "rakuten700", label: "楽天 商品画像 700²", w: 700, h: 700 },
  { id: "rakuten1200", label: "楽天/汎用 1200²", w: 1200, h: 1200 },
  { id: "yahoo600", label: "Yahoo 600²", w: 600, h: 600 },
  { id: "amazon2000", label: "Amazon メイン 2000²", w: 2000, h: 2000 },
  { id: "ig-square", label: "Instagram 正方形 1080²", w: 1080, h: 1080 },
  { id: "ig-portrait", label: "Instagram 縦 1080×1350", w: 1080, h: 1350 },
  { id: "ogp", label: "OGP/バナー 1200×630", w: 1200, h: 630 },
];

type Fit = "cover" | "contain";

interface Out {
  key: string;
  srcName: string;
  preset: Preset;
  url: string;
  blob: Blob;
}

export default function ImageMultisize() {
  const [selected, setSelected] = useState<Record<string, boolean>>({
    rakuten700: true,
    amazon2000: true,
    "ig-square": true,
  });
  const [fit, setFit] = useState<Fit>("cover");
  const [bg, setBg] = useState("#ffffff");
  const [quality, setQuality] = useState(0.9);
  const [outs, setOuts] = useState<Out[]>([]);
  const [busy, setBusy] = useState(false);

  const chosen = PRESETS.filter((p) => selected[p.id]);

  async function handle(files: FileList | null) {
    if (!files || !chosen.length) return;
    setBusy(true);
    const result: Out[] = [];
    for (const file of Array.from(files)) {
      const img = await loadImage(file);
      for (const p of chosen) {
        const blob = await render(img, p, fit, bg, quality);
        if (blob)
          result.push({
            key: `${file.name}-${p.id}`,
            srcName: file.name.replace(/\.[^.]+$/, ""),
            preset: p,
            url: URL.createObjectURL(blob),
            blob,
          });
      }
    }
    setOuts(result);
    setBusy(false);
    if (result.length)
      recordHistory("image-multisize", `${result.length}枚を書き出し`, `${chosen.map((p) => p.label).join(" / ")}`);
  }

  function downloadAll() {
    outs.forEach((o, i) => {
      setTimeout(
        () => triggerDownload(o.blob, `${o.srcName}_${o.preset.w}x${o.preset.h}.jpg`),
        i * 120,
      );
    });
  }

  return (
    <ToolShell slug="image-multisize">
      <Field label="書き出しサイズ（複数選択可）">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <label
              key={p.id}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                selected[p.id] ? "border-[var(--brand)] bg-[var(--surface-soft)] font-semibold" : ""
              }`}
            >
              <input
                type="checkbox"
                className="mr-1"
                checked={Boolean(selected[p.id])}
                onChange={(e) => setSelected((s) => ({ ...s, [p.id]: e.target.checked }))}
              />
              {p.label}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="フィット方法">
          <select value={fit} onChange={(e) => setFit(e.target.value as Fit)} className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="cover">cover（中央トリミング）</option>
            <option value="contain">contain（余白付き・全体表示）</option>
          </select>
        </Field>
        <Field label="余白の色（contain時）">
          <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 w-full rounded-md border" />
        </Field>
        <Field label={`JPEG画質 ${quality.toFixed(2)}`}>
          <input type="range" min={0.5} max={1} step={0.05} value={quality} onChange={(e) => setQuality(+e.target.value)} className="w-full" />
        </Field>
      </div>

      <div className="card border-dashed p-6 text-center">
        <input type="file" accept="image/*" multiple onChange={(e) => handle(e.target.files)} className="text-sm" />
        <p className="mt-2 text-xs text-[var(--muted)]">Canvas 処理。画像は外部送信されません。</p>
      </div>

      {busy && <p className="text-sm">処理中…</p>}

      {outs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm">{outs.length} 枚</p>
            <button onClick={downloadAll} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              すべてダウンロード
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {outs.map((o) => (
              <div key={o.key} className="card p-2 text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.url} alt="" className="mb-1 w-full rounded object-contain" style={{ background: bg }} />
                <div className="truncate font-medium">{o.srcName}</div>
                <div className="text-[var(--muted)]">
                  {o.preset.w}×{o.preset.h}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ToolShell>
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      res(img);
    };
    img.onerror = rej;
    img.src = url;
  });
}

function render(
  img: HTMLImageElement,
  p: Preset,
  fit: Fit,
  bg: string,
  q: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = p.w;
  canvas.height = p.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, p.w, p.h);
  const scale =
    fit === "cover"
      ? Math.max(p.w / img.width, p.h / img.height)
      : Math.min(p.w / img.width, p.h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (p.w - dw) / 2, (p.h - dh) / 2, dw, dh);
  return new Promise((res) => canvas.toBlob(res, "image/jpeg", q));
}
