"use client";

import { useMemo, useState } from "react";
import { ToolShell, Stat } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader, findCol } from "@/lib/csvmap";
import { matchCategory, YAHOO_CATEGORIES } from "@/lib/yahoocat";
import { recordHistory } from "@/lib/history";

interface Row {
  code: string;
  name: string;
  category: string;
  desc: string;
  guess: string; // entry id
  confidence: number;
  alts: string[];
}

export default function YahooProductCategory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  function onFile(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iCode = findCol(header, ["code", "商品コード", "sku", "jan", "商品番号"]);
      const iName = findCol(header, ["name", "商品名", "title", "item-name"]);
      const iCat = findCol(header, ["product-category", "category", "path", "カテゴリ", "ジャンル"]);
      const iDesc = findCol(header, ["caption", "explanation", "商品説明", "description", "abstract", "headline"]);
      const parsed: Row[] = rows
        .map((r) => {
          const name = iName >= 0 ? r[iName] ?? "" : r[0] ?? "";
          const category = iCat >= 0 ? r[iCat] ?? "" : "";
          const desc = iDesc >= 0 ? r[iDesc] ?? "" : "";
          const m = matchCategory(name, category, desc);
          const total = m.reduce((s, x) => s + x.score, 0) || 1;
          return {
            code: iCode >= 0 ? r[iCode] ?? "" : "",
            name,
            category,
            desc,
            guess: m[0]?.entry.id ?? "",
            confidence: m[0] ? m[0].score / total : 0,
            alts: m.slice(1).map((x) => x.entry.id),
          };
        })
        .filter((r) => r.name.trim());
      setRows(parsed);
      setLoaded(true);
      recordHistory("yahoo-product-category", `${parsed.length}行を推定`, `未判定 ${parsed.filter((r) => !r.guess).length}`);
    });
  }

  const pathOf = (id: string) => YAHOO_CATEGORIES.find((c) => c.id === id)?.path ?? "";

  const stats = useMemo(() => {
    const decided = rows.filter((r) => r.guess).length;
    const lowConf = rows.filter((r) => r.guess && r.confidence < 0.5).length;
    return { decided, none: rows.length - decided, lowConf };
  }, [rows]);

  function setGuess(i: number, id: string) {
    setRows((arr) => arr.map((r, k) => (k === i ? { ...r, guess: id, confidence: 1 } : r)));
  }

  function exportCsv() {
    downloadCSV("yahoo-category-mapped", [
      ["商品コード", "商品名", "推定カテゴリ", "確信度", "元カテゴリ"],
      ...rows.map((r) => [r.code, r.name, pathOf(r.guess), `${Math.round(r.confidence * 100)}%`, r.category]),
    ]);
  }

  return (
    <ToolShell slug="yahoo-product-category">
      <div className="card border-dashed p-4">
        <input type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        <p className="mt-1 text-xs text-[var(--muted)]">
          商品CSV（商品名・説明・既存カテゴリ列を自動検出）を読み込み。辞書ベースの推定です。
        </p>
      </div>

      {loaded && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="推定できた行" value={`${stats.decided} / ${rows.length}`} tone={stats.none ? "warn" : "ok"} />
            <Stat label="未判定" value={`${stats.none}`} tone={stats.none ? "bad" : "ok"} />
            <Stat label="確信度が低い" value={`${stats.lowConf}`} tone={stats.lowConf ? "warn" : "ok"} />
          </div>

          <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
            マッピングCSVを出力
          </button>

          <div className="space-y-2">
            {rows.slice(0, 80).map((r, i) => (
              <div key={i} className="card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{r.name.slice(0, 40)}</span>
                  {r.guess ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        background: r.confidence >= 0.5 ? "#1a8a5a22" : "#a1701c22",
                        color: r.confidence >= 0.5 ? "#1a8a5a" : "#a1701c",
                      }}
                    >
                      確信度 {Math.round(r.confidence * 100)}%
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#bf000022] px-2 py-0.5 text-[11px] font-semibold text-[#bf0000]">未判定</span>
                  )}
                </div>
                <div className="mt-2">
                  <select
                    value={r.guess}
                    onChange={(e) => setGuess(i, e.target.value)}
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                  >
                    <option value="">（カテゴリを選択）</option>
                    {/* 候補を先頭に */}
                    {[r.guess, ...r.alts].filter(Boolean).map((id) => (
                      <option key={"c" + id} value={id}>
                        ★ {pathOf(id)}
                      </option>
                    ))}
                    <option disabled>──────────</option>
                    {YAHOO_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.path}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {rows.length > 80 && <p className="text-xs text-[var(--muted)]">…ほか {rows.length - 80} 行（CSVで全件出力）</p>}
          </div>

          <p className="text-xs text-[var(--muted)]">
            ※ Yahoo公式のプロダクトカテゴリID は非公開・多階層のため、ここでは代表的な階層のパスラベルで推定します。
            出力後、ストアクリエイターProのカテゴリ設定に合わせてIDを割り当ててください。
          </p>
        </>
      )}
    </ToolShell>
  );
}
