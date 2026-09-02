"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader } from "@/lib/csvmap";
import {
  CANON_ORDER,
  CANON_LABEL,
  FORMAT_LABEL,
  FORMAT_COLUMNS,
  type MallFormat,
  type CanonKey,
} from "@/lib/mallschema";
import { recordHistory } from "@/lib/history";

const norm = (s: string) => s.replace(/[\s"'　（）()【】[\]]/g, "").toLowerCase();

export default function CsvMallConverter() {
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [srcFmt, setSrcFmt] = useState<MallFormat>("rakuten");
  const [dstFmt, setDstFmt] = useState<MallFormat>("shopify");
  // canonKey -> source column index (-1 = なし)
  const [map, setMap] = useState<Partial<Record<CanonKey, number>>>({});

  function onFile(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      setHeader(header);
      setRows(rows);
      autoMap(header, srcFmt);
    });
  }

  function autoMap(hdr: string[], fmt: MallFormat) {
    const H = hdr.map(norm);
    const next: Partial<Record<CanonKey, number>> = {};
    for (const key of CANON_ORDER) {
      const aliases = FORMAT_COLUMNS[fmt][key] ?? [];
      let idx = -1;
      for (const a of aliases) {
        const na = norm(a);
        idx = H.findIndex((h) => h === na);
        if (idx < 0) idx = H.findIndex((h) => h.includes(na) || na.includes(h));
        if (idx >= 0) break;
      }
      next[key] = idx;
    }
    setMap(next);
  }

  function detectFormat(hdr: string[]) {
    const H = hdr.map(norm);
    let best: MallFormat = "rakuten";
    let bestScore = -1;
    (Object.keys(FORMAT_COLUMNS) as MallFormat[]).forEach((fmt) => {
      let score = 0;
      for (const key of CANON_ORDER) {
        for (const a of FORMAT_COLUMNS[fmt][key] ?? []) {
          if (H.some((h) => h === norm(a))) score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = fmt;
      }
    });
    setSrcFmt(best);
    autoMap(hdr, best);
  }

  const outHeader = useMemo(() => {
    return CANON_ORDER.filter((k) => k !== "cost").map(
      (k) => (FORMAT_COLUMNS[dstFmt][k] ?? [])[0] ?? CANON_LABEL[k],
    );
  }, [dstFmt]);

  const outRows = useMemo(() => {
    const keys = CANON_ORDER.filter((k) => k !== "cost");
    return rows.map((r) =>
      keys.map((k) => {
        const i = map[k];
        return i != null && i >= 0 ? (r[i] ?? "") : "";
      }),
    );
  }, [rows, map]);

  function exportCsv() {
    downloadCSV(`converted-${dstFmt}`, [outHeader, ...outRows]);
    recordHistory("csv-mall-converter", `${FORMAT_LABEL[srcFmt]} → ${FORMAT_LABEL[dstFmt]}`, `${rows.length}行`);
  }

  return (
    <ToolShell slug="csv-mall-converter">
      <div className="card border-dashed p-4">
        <input type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        <p className="mt-1 text-xs text-[var(--muted)]">
          変換元CSVを読み込み。処理はブラウザ内で完結（外部送信なし）。
        </p>
      </div>

      {header.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="変換元フォーマット">
              <div className="flex gap-2">
                <select
                  value={srcFmt}
                  onChange={(e) => {
                    const f = e.target.value as MallFormat;
                    setSrcFmt(f);
                    autoMap(header, f);
                  }}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {(Object.keys(FORMAT_LABEL) as MallFormat[]).map((f) => (
                    <option key={f} value={f}>
                      {FORMAT_LABEL[f]}
                    </option>
                  ))}
                </select>
                <button onClick={() => detectFormat(header)} className="shrink-0 rounded-md border px-3 text-xs font-semibold">
                  自動判定
                </button>
              </div>
            </Field>
            <Field label="変換先フォーマット">
              <select
                value={dstFmt}
                onChange={(e) => setDstFmt(e.target.value as MallFormat)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {(Object.keys(FORMAT_LABEL) as MallFormat[]).map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABEL[f]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold">列マッピング（変換元の列を選択）</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CANON_ORDER.filter((k) => k !== "cost").map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <span className="w-32 shrink-0 text-[var(--muted)]">{CANON_LABEL[k]}</span>
                  <select
                    value={map[k] ?? -1}
                    onChange={(e) => setMap((m) => ({ ...m, [k]: +e.target.value }))}
                    className="flex-1 rounded-md border px-2 py-1"
                  >
                    <option value={-1}>—（なし）</option>
                    {header.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `列${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              {FORMAT_LABEL[dstFmt]} 形式でCSV出力（{rows.length}行）
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-[var(--muted)]">
                  {outHeader.map((h, i) => (
                    <th key={i} className="py-1.5 pr-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outRows.slice(0, 15).map((r, ri) => (
                  <tr key={ri} className="border-b">
                    {r.map((c, ci) => (
                      <td key={ci} className="py-1.5 pr-3">
                        {c.length > 40 ? c.slice(0, 40) + "…" : c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {outRows.length > 15 && <p className="mt-1 text-xs text-[var(--muted)]">…ほか {outRows.length - 15} 行</p>}
          </div>

          <p className="text-xs text-[var(--muted)]">
            ※ 列名は一般的な目安です。各モールの最新フォーマット・必須項目に合わせて出力後に調整してください。
          </p>
        </>
      )}
    </ToolShell>
  );
}
