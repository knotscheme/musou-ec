"use client";

import { useMemo, useState } from "react";
import { ToolShell, Stat } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader, findCol, num } from "@/lib/csvmap";
import { scanNg } from "@/lib/ngwords";
import { recordHistory } from "@/lib/history";

interface Issue {
  row: number;
  code: string;
  level: "error" | "warn";
  field: string;
  message: string;
}

export default function YahooItemCsv() {
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [checked, setChecked] = useState(false);

  function onFile(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      setHeader(header);
      setRows(rows);
      setChecked(false);
      setIssues([]);
    });
  }

  const cols = useMemo(() => {
    return {
      code: findCol(header, ["code", "商品コード"]),
      name: findCol(header, ["name", "商品名"]),
      price: findCol(header, ["price", "販売価格"]),
      qty: findCol(header, ["quantity", "在庫数"]),
      cat: findCol(header, ["product-category", "path", "category-id", "プロダクトカテゴリ"]),
      caption: findCol(header, ["caption", "商品説明", "explanation"]),
      headline: findCol(header, ["headline", "abstract", "キャッチコピー"]),
    };
  }, [header]);

  function run() {
    const out: Issue[] = [];
    rows.forEach((r, ri) => {
      const code = cols.code >= 0 ? r[cols.code] ?? "" : `行${ri + 2}`;
      const req = (idx: number, field: string) => {
        if (idx < 0 || !(r[idx] ?? "").trim()) out.push({ row: ri + 2, code, level: "error", field, message: `${field} が未入力` });
      };
      req(cols.code, "商品コード");
      req(cols.name, "商品名");
      req(cols.price, "販売価格");

      if (cols.price >= 0) {
        const p = num(r[cols.price]);
        if (r[cols.price] && p <= 0) out.push({ row: ri + 2, code, level: "error", field: "販売価格", message: `価格が 0 以下（${r[cols.price]}）` });
      }
      if (cols.qty >= 0 && r[cols.qty] && num(r[cols.qty]) < 0)
        out.push({ row: ri + 2, code, level: "error", field: "在庫数", message: "在庫数がマイナス" });
      if (cols.cat < 0 || !(r[cols.cat] ?? "").trim())
        out.push({ row: ri + 2, code, level: "warn", field: "プロダクトカテゴリ", message: "未設定（検索露出に不利）" });
      if (cols.name >= 0) {
        const nlen = [...(r[cols.name] ?? "")].length;
        if (nlen > 75) out.push({ row: ri + 2, code, level: "warn", field: "商品名", message: `${nlen}文字（75文字目安を超過）` });
      }
      if (cols.headline >= 0) {
        const hlen = [...(r[cols.headline] ?? "")].length;
        if (hlen > 60) out.push({ row: ri + 2, code, level: "warn", field: "キャッチコピー", message: `${hlen}文字（長すぎ）` });
      }
      for (const idx of [cols.name, cols.caption, cols.headline]) {
        if (idx < 0) continue;
        const hits = scanNg(r[idx] ?? "");
        if (hits.length)
          out.push({
            row: ri + 2,
            code,
            level: "warn",
            field: header[idx] || "テキスト",
            message: `NG表現の可能性: ${[...new Set(hits.map((h) => h.entry.word))].slice(0, 4).join(", ")}`,
          });
      }
    });
    setIssues(out);
    setChecked(true);
    recordHistory("yahoo-item-csv", `${rows.length}行を検査`, `エラー${out.filter((i) => i.level === "error").length} / 警告${out.filter((i) => i.level === "warn").length}`);
  }

  const errCount = issues.filter((i) => i.level === "error").length;
  const warnCount = issues.filter((i) => i.level === "warn").length;

  return (
    <ToolShell slug="yahoo-item-csv">
      <div className="card border-dashed p-4">
        <input type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        <p className="mt-1 text-xs text-[var(--muted)]">Yahoo!ショッピングの商品データCSVを読み込み。ブラウザ内で検査します。</p>
      </div>

      {header.length > 0 && (
        <>
          <div className="card p-3 text-xs text-[var(--muted)]">
            検出列: 商品コード{cols.code >= 0 ? "✓" : "✗"} / 商品名{cols.name >= 0 ? "✓" : "✗"} / 価格
            {cols.price >= 0 ? "✓" : "✗"} / 在庫{cols.qty >= 0 ? "✓" : "✗"} / カテゴリ{cols.cat >= 0 ? "✓" : "✗"}
          </div>
          <button onClick={run} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
            検査する（{rows.length}行）
          </button>
        </>
      )}

      {checked && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="エラー" value={`${errCount}`} tone={errCount ? "bad" : "ok"} />
            <Stat label="警告" value={`${warnCount}`} tone={warnCount ? "warn" : "ok"} />
            <Stat label="対象行" value={`${rows.length}`} />
          </div>

          {issues.length > 0 ? (
            <>
              <button
                onClick={() =>
                  downloadCSV("yahoo-csv-issues", [
                    ["行", "商品コード", "レベル", "項目", "内容"],
                    ...issues.map((i) => [i.row, i.code, i.level === "error" ? "エラー" : "警告", i.field, i.message]),
                  ])
                }
                className="rounded-md border px-4 py-2 text-sm font-semibold"
              >
                指摘リストCSV
              </button>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b text-left text-[var(--muted)]">
                      <th className="py-2 pr-3">行</th>
                      <th className="py-2 pr-3">コード</th>
                      <th className="py-2 pr-3">レベル</th>
                      <th className="py-2 pr-3">項目</th>
                      <th className="py-2 pr-3">内容</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.slice(0, 100).map((i, k) => (
                      <tr key={k} className="border-b">
                        <td className="py-2 pr-3">{i.row}</td>
                        <td className="py-2 pr-3 font-mono">{i.code}</td>
                        <td className="py-2 pr-3 font-semibold" style={{ color: i.level === "error" ? "#bf0000" : "#a1701c" }}>
                          {i.level === "error" ? "エラー" : "警告"}
                        </td>
                        <td className="py-2 pr-3">{i.field}</td>
                        <td className="py-2 pr-3">{i.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {issues.length > 100 && <p className="mt-1 text-xs text-[var(--muted)]">…ほか {issues.length - 100} 件（CSVで全件確認）</p>}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: "#1a8a5a" }}>指摘なし。主要項目に問題は見つかりませんでした。</p>
          )}
        </>
      )}
    </ToolShell>
  );
}
