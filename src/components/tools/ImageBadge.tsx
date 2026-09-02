"use client";

import { useState } from "react";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { triggerDownload } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

type Style = "band-top" | "band-bottom" | "ribbon" | "badge-only";

interface Out {
  name: string;
  url: string;
  blob: Blob;
}

export default function ImageBadge() {
  const [style, setStyle] = useState<Style>("band-bottom");
  const [text, setText] = useState("SALE 20%OFF");
  const [badgeText, setBadgeText] = useState("送料無料");
  const [showBadge, setShowBadge] = useState(true);
  const [bandColor, setBandColor] = useState("#bf0000");
  const [textColor, setTextColor] = useState("#ffffff");
  const [bandRatio, setBandRatio] = useState(16); // % of height
  const [outs, setOuts] = useState<Out[]>([]);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    const res: Out[] = [];
    for (const file of Array.from(files)) {
      const img = await loadImage(file);
      const blob = await render(img, {
        style,
        text,
        badgeText,
        showBadge,
        bandColor,
        textColor,
        bandRatio,
      });
      if (blob) {
        res.push({
          name: file.name.replace(/\.[^.]+$/, ""),
          url: URL.createObjectURL(blob),
          blob,
        });
      }
    }
    setOuts(res);
    setBusy(false);
    if (res.length) recordHistory("image-badge", `${res.length}枚に帯/バッジ合成`, `${style} "${text}"`);
  }

  function downloadAll() {
    outs.forEach((o, i) => setTimeout(() => triggerDownload(o.blob, `${o.name}_badge.jpg`), i * 120));
  }

  return (
    <ToolShell slug="image-badge">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="スタイル">
          <select value={style} onChange={(e) => setStyle(e.target.value as Style)} className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="band-bottom">帯（下）</option>
            <option value="band-top">帯（上）</option>
            <option value="ribbon">リボン（左上・斜め）</option>
            <option value="badge-only">円バッジのみ（右上）</option>
          </select>
        </Field>
        <Field label={`帯の高さ ${bandRatio}%`}>
          <input type="range" min={8} max={30} value={bandRatio} onChange={(e) => setBandRatio(+e.target.value)} className="w-full" />
        </Field>
        <Field label="帯/リボンのテキスト">
          <TextInput value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="円バッジのテキスト">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={showBadge} onChange={(e) => setShowBadge(e.target.checked)} />
            <TextInput value={badgeText} onChange={(e) => setBadgeText(e.target.value)} />
          </div>
        </Field>
        <Field label="帯の色">
          <input type="color" value={bandColor} onChange={(e) => setBandColor(e.target.value)} className="h-10 w-full rounded-md border" />
        </Field>
        <Field label="文字色">
          <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-10 w-full rounded-md border" />
        </Field>
      </div>

      <div className="card border-dashed p-6 text-center">
        <input type="file" accept="image/*" multiple onChange={(e) => handle(e.target.files)} className="text-sm" />
        <p className="mt-2 text-xs text-[var(--muted)]">
          元画像の縦横はそのまま。Canvas 合成でサーバー送信なし。楽天/Yahooのバナー規制に合わせてテキスト量を調整してください。
        </p>
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
              <div key={o.name} className="card p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.url} alt={o.name} className="w-full rounded" />
                <div className="mt-1 truncate text-xs font-medium">{o.name}</div>
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

interface Opts {
  style: Style;
  text: string;
  badgeText: string;
  showBadge: boolean;
  bandColor: string;
  textColor: string;
  bandRatio: number;
}

function render(img: HTMLImageElement, o: Opts): Promise<Blob | null> {
  const W = img.width;
  const H = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(img, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (o.style === "band-top" || o.style === "band-bottom") {
    const bh = Math.round((H * o.bandRatio) / 100);
    const y = o.style === "band-top" ? 0 : H - bh;
    ctx.fillStyle = o.bandColor;
    ctx.fillRect(0, y, W, bh);
    ctx.fillStyle = o.textColor;
    ctx.font = `bold ${Math.round(bh * 0.5)}px sans-serif`;
    ctx.fillText(o.text, W / 2, y + bh / 2, W * 0.94);
  } else if (o.style === "ribbon") {
    const size = Math.round(Math.min(W, H) * 0.42);
    ctx.save();
    ctx.translate(0, 0);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.55);
    ctx.lineTo(size * 0.55, 0);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.closePath();
    ctx.fillStyle = o.bandColor;
    ctx.fill();
    ctx.translate(size * 0.3, size * 0.3);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = o.textColor;
    ctx.font = `bold ${Math.round(size * 0.16)}px sans-serif`;
    ctx.fillText(o.text, 0, 0, size * 1.1);
    ctx.restore();
  }

  if (o.showBadge && o.badgeText && o.style !== "ribbon") {
    const r = Math.round(Math.min(W, H) * 0.16);
    const cx = W - r - Math.round(W * 0.04);
    const cy = r + Math.round(H * 0.04);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = o.bandColor;
    ctx.fill();
    ctx.fillStyle = o.textColor;
    ctx.font = `bold ${Math.round(r * 0.42)}px sans-serif`;
    ctx.fillText(o.badgeText, cx, cy, r * 1.7);
  }

  return new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
}
