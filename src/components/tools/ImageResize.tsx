"use client";

import { useState } from "react";
import { ToolShell, Field } from "@/components/ToolShell";
import { triggerDownload } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

interface Result {
  name: string;
  beforeKB: number;
  afterKB: number;
  w: number;
  h: number;
  blob: Blob;
  url: string;
}

type Fmt = "image/jpeg" | "image/webp" | "image/png";

export default function ImageResize() {
  const [maxEdge, setMaxEdge] = useState(1200);
  const [quality, setQuality] = useState(0.8);
  const [format, setFormat] = useState<Fmt>("image/jpeg");
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const out: Result[] = [];
    for (const file of Array.from(files)) {
      try {
        out.push(await processImage(file, maxEdge, quality, format));
      } catch {
        /* skip unreadable file */
      }
    }
    setResults(out);
    setBusy(false);
    if (out.length) {
      const saved = out.reduce((s, r) => s + (r.beforeKB - r.afterKB), 0);
      recordHistory(
        "image-resize",
        `${out.length}枚をリサイズ・圧縮`,
        `長辺${maxEdge}px / ${format.replace("image/", "")} / 合計 ${saved.toFixed(0)}KB 削減`,
      );
    }
  }

  function downloadAll() {
    const ext = format === "image/png" ? "png" : format === "image/webp" ? "webp" : "jpg";
    results.forEach((r, i) => {
      const base = r.name.replace(/\.[^.]+$/, "");
      setTimeout(() => triggerDownload(r.blob, `${base}_resized.${ext}`), i * 120);
    });
  }

  const totalBefore = results.reduce((s, r) => s + r.beforeKB, 0);
  const totalAfter = results.reduce((s, r) => s + r.afterKB, 0);

  return (
    <ToolShell slug="image-resize">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="長辺の最大px" hint="縦横比は維持">
          <input
            type="number"
            value={maxEdge}
            onChange={(e) => setMaxEdge(Math.max(1, +e.target.value))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label={`画質 ${quality.toFixed(2)}`} hint="JPEG / WebP のみ">
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            value={quality}
            onChange={(e) => setQuality(+e.target.value)}
            className="w-full"
          />
        </Field>
        <Field label="出力形式">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as Fmt)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
            <option value="image/png">PNG</option>
          </select>
        </Field>
      </div>

      <div className="card border-dashed p-6 text-center">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="block w-full text-sm"
        />
        <p className="mt-2 text-xs text-[var(--muted)]">
          画像は Canvas で処理され、外部に送信されません。
        </p>
      </div>

      {busy && <p className="text-sm">処理中…</p>}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">
              {results.length} 件 / {totalBefore.toFixed(0)}KB →{" "}
              <b>{totalAfter.toFixed(0)}KB</b>（
              {totalBefore > 0 ? (100 - (totalAfter / totalBefore) * 100).toFixed(0) : 0}% 減）
            </p>
            <button
              onClick={downloadAll}
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              すべてダウンロード
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {results.map((r) => (
              <div key={r.name} className="card flex gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt={r.name} className="h-20 w-20 rounded object-cover" />
                <div className="min-w-0 text-xs">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-[var(--muted)]">
                    {r.w}×{r.h}px
                  </div>
                  <div>
                    {r.beforeKB.toFixed(0)}KB → <b>{r.afterKB.toFixed(0)}KB</b> (
                    {(100 - (r.afterKB / r.beforeKB) * 100).toFixed(0)}% 減)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolShell>
  );
}

function processImage(file: File, maxEdge: number, quality: number, format: string): Promise<Result> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error("no ctx"));
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("toBlob failed"));
          resolve({
            name: file.name,
            beforeKB: file.size / 1024,
            afterKB: blob.size / 1024,
            w,
            h,
            blob,
            url: URL.createObjectURL(blob),
          });
        },
        format,
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load failed"));
    };
    img.src = url;
  });
}
