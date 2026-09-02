"use client";

import { useState } from "react";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

type Op = "replace" | "prefix" | "suffix" | "setvalue" | "mul" | "add" | "round";

export default function RakutenRmsCsv() {
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [orig, setOrig] = useState<string[][]>([]);
  const [col, setCol] = useState(0);
  const [op, setOp] = useState<Op>("replace");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [roundMode, setRoundMode] = useState<"round" | "ceil" | "floor">("round");
  const [roundUnit, setRoundUnit] = useState(1);
  const [filterOnly, setFilterOnly] = useState("");
  const [log, setLog] = useState<string[]>([]);

  function onFile(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const all = parseCSV(t).filter((r) => r.some((c) => c.trim() !== ""));
      if (all.length === 0) return;
      setHeader(all[0]);
      setRows(all.slice(1));
      setOrig(all.slice(1).map((r) => [...r]));
      setCol(0);
      setLog([`読込: ${all.length - 1} 行 / ${all[0].length} 列`]);
    });
  }

  function apply() {
    const match = filterOnly.trim();
    let changed = 0;
    const next = rows.map((r) => {
      const row = [...r];
      if (match && !(row[col] ?? "").includes(match)) return row;
      const cur = row[col] ?? "";
      let v = cur;
      if (op === "replace") v = a ? cur.split(a).join(b) : cur;
      else if (op === "prefix") v = a + cur;
      else if (op === "suffix") v = cur + a;
      else if (op === "setvalue") v = a;
      else if (op === "mul" || op === "add" || op === "round") {
        const num = parseFloat(cur.replace(/[^\d.-]/g, ""));
        if (!Number.isNaN(num)) {
          let n = num;
          if (op === "mul") n = num * (parseFloat(a) || 1);
          else if (op === "add") n = num + (parseFloat(a) || 0);
          const u = Math.max(1, roundUnit);
          n = roundMode === "ceil" ? Math.ceil(n / u) * u : roundMode === "floor" ? Math.floor(n / u) * u : Math.round(n / u) * u;
          v = String(n);
        }
      }
      if (v !== cur) changed++;
      row[col] = v;
      return row;
    });
    setRows(next);
    setLog((l) => [
      ...l,
      `${header[col] ?? `列${col}`} に ${opLabel(op)}${match ? `（"${match}"を含む行のみ）` : ""} → ${changed} セル変更`,
    ]);
  }

  function reset() {
    setRows(orig.map((r) => [...r]));
    setLog((l) => [...l, "元データに戻しました"]);
  }

  function exportCsv() {
    downloadCSV("rms-item-edited", [header, ...rows]);
    recordHistory("rakuten-rms-csv", `${rows.length}行を編集・書き出し`, log.slice(1).join(" / ").slice(0, 80));
  }

  const numeric = op === "mul" || op === "add" || op === "round";

  return (
    <ToolShell slug="rakuten-rms-csv">
      <div className="card border-dashed p-4">
        <input type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        <p className="mt-1 text-xs text-[var(--muted)]">
          RMS の item.csv 等を読み込み。処理はすべてブラウザ内で完結します（外部送信なし）。
        </p>
      </div>

      {header.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="対象の列">
              <select
                value={col}
                onChange={(e) => setCol(+e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                {header.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `列${i + 1}`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="操作">
              <select
                value={op}
                onChange={(e) => setOp(e.target.value as Op)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="replace">文字を置換</option>
                <option value="prefix">先頭に追加</option>
                <option value="suffix">末尾に追加</option>
                <option value="setvalue">固定値をセット</option>
                <option value="mul">数値 × 係数</option>
                <option value="add">数値 + 加算</option>
                <option value="round">数値を丸めるだけ</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {op === "replace" ? (
              <>
                <Field label="置換前"><TextInput value={a} onChange={(e) => setA(e.target.value)} /></Field>
                <Field label="置換後"><TextInput value={b} onChange={(e) => setB(e.target.value)} /></Field>
              </>
            ) : op === "mul" ? (
              <Field label="係数" hint="例）0.9 で10%OFF"><TextInput value={a} onChange={(e) => setA(e.target.value)} /></Field>
            ) : op === "add" ? (
              <Field label="加算値" hint="マイナス可"><TextInput value={a} onChange={(e) => setA(e.target.value)} /></Field>
            ) : op === "round" ? null : (
              <Field label="値"><TextInput value={a} onChange={(e) => setA(e.target.value)} /></Field>
            )}
            {numeric && (
              <div className="flex items-end gap-2">
                <Field label="丸め">
                  <select
                    value={roundMode}
                    onChange={(e) => setRoundMode(e.target.value as "round" | "ceil" | "floor")}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="round">四捨五入</option>
                    <option value="ceil">切り上げ</option>
                    <option value="floor">切り捨て</option>
                  </select>
                </Field>
                <Field label="単位">
                  <TextInput
                    type="number"
                    value={roundUnit}
                    onChange={(e) => setRoundUnit(+e.target.value)}
                    className="w-24"
                  />
                </Field>
              </div>
            )}
          </div>

          <Field label="この文字を含む行だけに適用（任意）">
            <TextInput value={filterOnly} onChange={(e) => setFilterOnly(e.target.value)} placeholder="空欄なら全行" />
          </Field>

          <div className="flex flex-wrap gap-2">
            <button onClick={apply} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              適用（重ねがけ可）
            </button>
            <button onClick={reset} className="rounded-md border px-4 py-2 text-sm font-semibold">
              元に戻す
            </button>
            <button onClick={exportCsv} className="rounded-md border px-4 py-2 text-sm font-semibold">
              CSVダウンロード
            </button>
          </div>

          {log.length > 0 && (
            <div className="card p-3 text-xs text-[var(--muted)]">
              {log.map((l, i) => (
                <div key={i}>・{l}</div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-[var(--muted)]">
                  {header.map((h, i) => (
                    <th key={i} className={`py-1.5 pr-3 ${i === col ? "text-[var(--brand)]" : ""}`}>
                      {h || `列${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 30).map((r, ri) => (
                  <tr key={ri} className="border-b">
                    {r.map((c, ci) => (
                      <td key={ci} className={`py-1.5 pr-3 ${ci === col ? "font-semibold" : ""}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 30 && (
              <p className="mt-1 text-xs text-[var(--muted)]">…ほか {rows.length - 30} 行</p>
            )}
          </div>
        </>
      )}
    </ToolShell>
  );
}

function opLabel(op: Op): string {
  return {
    replace: "文字置換",
    prefix: "先頭追加",
    suffix: "末尾追加",
    setvalue: "固定値セット",
    mul: "×係数",
    add: "加算",
    round: "丸め",
  }[op];
}
