"use client";

import { useState } from "react";
import { ToolShell, Field } from "@/components/ToolShell";
import { normalizeCode, barcodeSvg } from "@/lib/ean13";
import { parseCSV, downloadCSV, triggerDownload } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

interface Row {
  input: string;
  label: string;
  code?: string;
  type?: string;
  status: "ok" | "fixed" | "error";
  message?: string;
  svg?: string;
}

export default function BarcodeGenerator() {
  const [raw, setRaw] = useState("4901234567894\n45012340\n4991234, サンプル商品A");
  const [rows, setRows] = useState<Row[]>([]);
  const [scale, setScale] = useState(2);

  function build() {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const out: Row[] = lines.map((line) => {
      const [codePart, ...rest] = line.split(",");
      const label = rest.join(",").trim();
      const n = normalizeCode(codePart);
      if (!n.ok || !n.code) {
        return { input: codePart.trim(), label, status: "error", message: n.error };
      }
      return {
        input: codePart.trim(),
        label,
        code: n.code,
        type: n.type,
        status: n.fixed ? "fixed" : "ok",
        message: n.fixed ? "チェックデジットを補完/訂正" : undefined,
        svg: barcodeSvg(n.code, { moduleWidth: 2, height: 70 }),
      };
    });
    setRows(out);
    const okCount = out.filter((r) => r.status !== "error").length;
    if (okCount) recordHistory("barcode-generator", `${okCount}件のバーコード生成`, raw.slice(0, 60));
  }

  function onCSV(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const rows = parseCSV(t).filter((r) => r.some((c) => c.trim()));
      const body = rows[0]?.[0]?.match(/[0-9]/) ? rows : rows.slice(1); // 1行目が数値でなければヘッダ扱い
      setRaw(body.map((r) => [r[0], r[1]].filter(Boolean).join(", ")).join("\n"));
    });
  }

  async function toPng(svg: string, name: string) {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((b) => b && triggerDownload(b, `${name}.png`), "image/png");
  }

  function downloadAll(kind: "svg" | "png") {
    rows
      .filter((r) => r.svg && r.code)
      .forEach((r, i) => {
        const name = r.label ? `${r.code}_${r.label}` : r.code!;
        setTimeout(() => {
          if (kind === "svg") {
            triggerDownload(new Blob([r.svg!], { type: "image/svg+xml" }), `${name}.svg`);
          } else {
            toPng(r.svg!, name);
          }
        }, i * 150);
      });
  }

  const okRows = rows.filter((r) => r.status !== "error");

  return (
    <ToolShell slug="barcode-generator">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field
          label="コード（1行に1件。「コード, ラベル」も可）"
          hint="12桁→チェックデジット自動付与 / 13桁→検証 / 7-8桁はEAN-8"
        >
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={6}
            className="w-full rounded-md border px-3 py-2 font-mono text-sm"
          />
        </Field>
        <div className="space-y-3">
          <Field label="PNG倍率">
            <select
              value={scale}
              onChange={(e) => setScale(+e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </Field>
          <label className="block text-xs text-[var(--brand)] underline">
            CSV読込
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onCSV(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={build}
          className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
        >
          生成
        </button>
        {okRows.length > 0 && (
          <>
            <button onClick={() => downloadAll("png")} className="rounded-md border px-4 py-2 text-sm font-semibold">
              全部PNG
            </button>
            <button onClick={() => downloadAll("svg")} className="rounded-md border px-4 py-2 text-sm font-semibold">
              全部SVG
            </button>
            <button
              onClick={() =>
                downloadCSV("barcodes", [
                  ["入力", "コード", "種別", "状態"],
                  ...rows.map((r) => [r.input, r.code ?? "", r.type ?? "", r.message ?? r.status]),
                ])
              }
              className="rounded-md border px-4 py-2 text-sm font-semibold"
            >
              結果CSV
            </button>
          </>
        )}
      </div>

      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r, i) => (
            <div key={i} className="card p-3">
              {r.status === "error" ? (
                <div className="text-sm text-[#bf0000]">
                  <b>{r.input || "(空)"}</b>：{r.message}
                </div>
              ) : (
                <>
                  <div
                    className="overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: r.svg! }}
                  />
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-mono">{r.code}</span>
                    <span className="text-[var(--muted)]">
                      {r.type}
                      {r.status === "fixed" && " · 補完"}
                    </span>
                  </div>
                  {r.label && <div className="text-xs text-[var(--muted)]">{r.label}</div>}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => toPng(r.svg!, r.label ? `${r.code}_${r.label}` : r.code!)}
                      className="rounded border px-2 py-1 text-xs"
                    >
                      PNG
                    </button>
                    <button
                      onClick={() =>
                        triggerDownload(
                          new Blob([r.svg!], { type: "image/svg+xml" }),
                          `${r.code}.svg`,
                        )
                      }
                      className="rounded border px-2 py-1 text-xs"
                    >
                      SVG
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </ToolShell>
  );
}
