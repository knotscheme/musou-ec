"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader, findCol, num } from "@/lib/csvmap";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

interface PriceMap {
  label: string;
  rebate: number; // 実質還元率%
  map: Map<string, number>; // key(SKU/JAN) -> 価格
}

const SKU_ALIASES = ["sku", "jan", "商品コード", "商品番号", "商品管理番号", "code", "型番"];
const PRICE_ALIASES = ["価格", "販売価格", "price", "税込価格", "現在価格", "金額"];
const NAME_ALIASES = ["商品名", "name", "item-name", "title", "商品名称"];

export default function YahooPriceSync() {
  const [yahoo, setYahoo] = useState<{ map: Map<string, number>; names: Map<string, string> }>({
    map: new Map(),
    names: new Map(),
  });
  const [yahooRebate, setYahooRebate] = useState(5);
  const [sources, setSources] = useState<PriceMap[]>([]);
  const [nextId, setNextId] = useState(0);
  const [tolerance, setTolerance] = useState(2); // 拮抗とみなす±%

  function readMap(file: File, cb: (m: Map<string, number>, names: Map<string, string>) => void) {
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iSku = findCol(header, SKU_ALIASES);
      const iPrice = findCol(header, PRICE_ALIASES);
      const iName = findCol(header, NAME_ALIASES);
      const m = new Map<string, number>();
      const names = new Map<string, string>();
      for (const r of rows) {
        const key = (iSku >= 0 ? r[iSku] : r[0])?.trim();
        if (!key) continue;
        const p = iPrice >= 0 ? num(r[iPrice]) : num(r[1]);
        if (p > 0) m.set(key, p);
        if (iName >= 0 && r[iName]) names.set(key, r[iName]);
      }
      cb(m, names);
    });
  }

  function addSource(file: File | undefined) {
    if (!file) return;
    readMap(file, (m) => {
      setSources((s) => [...s, { label: `ソース${nextId + 1}`, rebate: 1, map: m }]);
      setNextId((n) => n + 1);
    });
  }

  const rows = useMemo(() => {
    const out: {
      key: string;
      name: string;
      yPrice: number;
      yReal: number;
      bestReal: number;
      bestLabel: string;
      diff: number;
      diffPct: number;
      suggest: number;
      verdict: "over" | "even" | "under";
    }[] = [];
    for (const [key, yPrice] of yahoo.map) {
      const yReal = yPrice * (1 - yahooRebate / 100);
      let bestReal = Infinity;
      let bestLabel = "";
      for (const s of sources) {
        const p = s.map.get(key);
        if (p == null) continue;
        const real = p * (1 - s.rebate / 100);
        if (real < bestReal) {
          bestReal = real;
          bestLabel = s.label;
        }
      }
      if (!Number.isFinite(bestReal)) continue;
      const diff = yReal - bestReal;
      const diffPct = bestReal > 0 ? diff / bestReal : 0;
      const suggest = bestReal / (1 - yahooRebate / 100);
      const verdict = diffPct > tolerance / 100 ? "over" : diffPct < -tolerance / 100 ? "under" : "even";
      out.push({
        key,
        name: yahoo.names.get(key) || "",
        yPrice,
        yReal,
        bestReal,
        bestLabel,
        diff,
        diffPct,
        suggest,
        verdict,
      });
    }
    out.sort((a, b) => b.diff - a.diff);
    return out;
  }, [yahoo, yahooRebate, sources, tolerance]);

  const overCount = rows.filter((r) => r.verdict === "over").length;
  const underCount = rows.filter((r) => r.verdict === "under").length;

  function exportCsv() {
    downloadCSV("yahoo-price-sync", [
      ["SKU", "商品名", "Yahoo価格", "Yahoo実質", "最安他モール実質", "最安ソース", "差分", "差分%", "推奨Yahoo価格", "判定"],
      ...rows.map((r) => [
        r.key, r.name, Math.round(r.yPrice), Math.round(r.yReal), Math.round(r.bestReal), r.bestLabel,
        Math.round(r.diff), `${(r.diffPct * 100).toFixed(1)}%`, Math.round(r.suggest),
        r.verdict === "over" ? "Yahoo割高" : r.verdict === "under" ? "Yahoo優位" : "拮抗",
      ]),
    ]);
    recordHistory("yahoo-price-sync", `割高${overCount} / 優位${underCount} SKU`, `照合${rows.length}件`);
  }

  return (
    <ToolShell slug="yahoo-price-sync">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Yahoo価格CSV（自店 / SKU・価格・商品名）">
          <input
            type="file"
            accept=".csv"
            className="text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) readMap(f, (map, names) => setYahoo({ map, names }));
            }}
          />
        </Field>
        <Field label="Yahoo 実質還元率（%）" hint="PayPay/LYPプレミアム等の合計">
          <NumberInput value={yahooRebate} onChange={(e) => setYahooRebate(+e.target.value)} />
        </Field>
        <Field label="拮抗とみなす差（±%）">
          <NumberInput value={tolerance} onChange={(e) => setTolerance(+e.target.value)} />
        </Field>
      </div>

      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">
          比較対象（他モール価格CSV）— 読み込み済み {yahoo.map.size} SKU（Yahoo）
        </p>
        <label className="inline-flex rounded-md border px-3 py-2 text-sm font-semibold">
          + 他モール価格CSVを追加
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              addSource(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <div className="mt-3 space-y-2">
          {sources.map((s, i) => (
            <div key={i} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
              <input
                value={s.label}
                onChange={(e) => setSources((arr) => arr.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                className="w-28 rounded-md border px-2 py-1"
              />
              <span className="text-[var(--muted)]">{s.map.size} SKU</span>
              <label className="flex items-center gap-1">
                実質還元率
                <NumberInput
                  value={s.rebate}
                  onChange={(e) => setSources((arr) => arr.map((x, k) => (k === i ? { ...x, rebate: +e.target.value } : x)))}
                  className="w-20"
                />
                %
              </label>
              <button onClick={() => setSources((arr) => arr.filter((_, k) => k !== i))} className="rounded-md border px-2 py-1 text-xs">
                削除
              </button>
            </div>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="照合SKU" value={`${rows.length}`} />
            <Stat label="Yahoo割高" value={`${overCount}`} tone={overCount ? "bad" : "ok"} />
            <Stat label="Yahoo優位" value={`${underCount}`} tone="ok" />
          </div>

          <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
            差分CSVを出力
          </button>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-[var(--muted)]">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Yahoo価格</th>
                  <th className="py-2 pr-3">Yahoo実質</th>
                  <th className="py-2 pr-3">他モール最安実質</th>
                  <th className="py-2 pr-3">差分</th>
                  <th className="py-2 pr-3">推奨Yahoo価格</th>
                  <th className="py-2 pr-3">判定</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 60).map((r) => (
                  <tr key={r.key} className="border-b">
                    <td className="py-2 pr-3 font-mono">{r.key}</td>
                    <td className="py-2 pr-3">{yen(r.yPrice)}</td>
                    <td className="py-2 pr-3">{yen(r.yReal)}</td>
                    <td className="py-2 pr-3">
                      {yen(r.bestReal)} <span className="text-[var(--muted)]">({r.bestLabel})</span>
                    </td>
                    <td className="py-2 pr-3" style={{ color: r.diff > 0 ? "#bf0000" : r.diff < 0 ? "#1a8a5a" : undefined }}>
                      {r.diff > 0 ? "+" : ""}
                      {yen(r.diff)}（{(r.diffPct * 100).toFixed(1)}%）
                    </td>
                    <td className="py-2 pr-3 font-semibold">{r.verdict === "over" ? yen(r.suggest) : "—"}</td>
                    <td
                      className="py-2 pr-3 font-semibold"
                      style={{ color: r.verdict === "over" ? "#bf0000" : r.verdict === "under" ? "#1a8a5a" : "#a1701c" }}
                    >
                      {r.verdict === "over" ? "割高" : r.verdict === "under" ? "優位" : "拮抗"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 60 && <p className="mt-1 text-xs text-[var(--muted)]">…ほか {rows.length - 60} 件（CSVで全件）</p>}
          </div>
          <p className="text-xs text-[var(--muted)]">
            実質価格 = 表示価格 × (1 − 実質還元率)。SKU/JAN が一致した行のみ比較します。
            推奨Yahoo価格は「他モール最安の実質価格に合わせる」表示価格です（粗利は別途確認）。
          </p>
        </>
      )}
    </ToolShell>
  );
}
