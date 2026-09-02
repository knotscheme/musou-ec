"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader, findCol, num } from "@/lib/csvmap";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

interface Ret {
  sku: string;
  name: string;
  qty: number;
  reasons: Record<string, number>;
}

export default function AmazonReturnAnalyzer() {
  const [rets, setRets] = useState<Ret[]>([]);
  const [salesMap, setSalesMap] = useState<Map<string, number>>(new Map());
  const [lossPerUnit, setLossPerUnit] = useState(1500);

  function onReturns(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iSku = findCol(header, ["sku", "merchant-sku", "商品番号", "出品者sku"]);
      const iName = findCol(header, ["商品名", "item-name", "product-name", "title"]);
      const iQty = findCol(header, ["数量", "quantity", "return-quantity", "返品数量"]);
      const iReason = findCol(header, ["理由", "reason", "return-reason", "返品理由", "customer-comments"]);
      const map = new Map<string, Ret>();
      for (const r of rows) {
        const sku = (iSku >= 0 ? r[iSku] : r[0]) || "(不明)";
        const cur = map.get(sku) ?? { sku, name: iName >= 0 ? r[iName] ?? "" : "", qty: 0, reasons: {} };
        const q = iQty >= 0 ? num(r[iQty]) || 1 : 1;
        cur.qty += q;
        const reason = (iReason >= 0 ? r[iReason] : "")?.trim() || "理由不明";
        cur.reasons[reason] = (cur.reasons[reason] ?? 0) + q;
        if (!cur.name && iName >= 0) cur.name = r[iName] ?? "";
        map.set(sku, cur);
      }
      setRets([...map.values()]);
    });
  }

  function onSales(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iSku = findCol(header, ["sku", "商品番号", "seller-sku"]);
      const iQty = findCol(header, ["数量", "quantity", "販売数", "個数"]);
      const m = new Map<string, number>();
      for (const r of rows) {
        const sku = iSku >= 0 ? r[iSku] : r[0];
        if (!sku) continue;
        m.set(sku, (m.get(sku) ?? 0) + (iQty >= 0 ? num(r[iQty]) || 1 : 1));
      }
      setSalesMap(m);
    });
  }

  const calc = useMemo(() => {
    const rows = rets.map((r) => {
      const sold = salesMap.get(r.sku) ?? 0;
      const rate = sold > 0 ? r.qty / sold : null;
      const topReason = Object.entries(r.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
      const loss = r.qty * lossPerUnit;
      return { ...r, sold, rate, topReason, loss };
    });
    rows.sort((a, b) => b.loss - a.loss);
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);
    const totalLoss = rows.reduce((s, r) => s + r.loss, 0);
    const reasonAgg: Record<string, number> = {};
    for (const r of rets) for (const [k, v] of Object.entries(r.reasons)) reasonAgg[k] = (reasonAgg[k] ?? 0) + v;
    const reasonSorted = Object.entries(reasonAgg).sort((a, b) => b[1] - a[1]);
    return { rows, totalQty, totalLoss, reasonSorted };
  }, [rets, salesMap, lossPerUnit]);

  function exportCsv() {
    downloadCSV("return-analysis", [
      ["SKU", "商品名", "返品数", "販売数", "返品率", "主な理由", "推定損失"],
      ...calc.rows.map((r) => [
        r.sku, r.name, r.qty, r.sold || "", r.rate != null ? `${(r.rate * 100).toFixed(1)}%` : "-", r.topReason, Math.round(r.loss),
      ]),
    ]);
    recordHistory("amazon-return-analyzer", `返品${calc.totalQty}件 / 損失${yen(calc.totalLoss)}`, `対象${calc.rows.length}SKU`);
  }

  return (
    <ToolShell slug="amazon-return-analyzer">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="FBA返品レポートCSV" hint="SKU / 商品名 / 数量 / 理由 を自動検出">
          <input type="file" accept=".csv" onChange={(e) => onReturns(e.target.files?.[0])} className="text-sm" />
        </Field>
        <Field label="販売数CSV（任意 / SKU,数量）" hint="返品率の算出に使用">
          <input type="file" accept=".csv" onChange={(e) => onSales(e.target.files?.[0])} className="text-sm" />
        </Field>
      </div>
      <Field label="返品1件あたりの推定損失（円）" hint="送料+再検品+廃棄/値下げの平均">
        <NumberInput value={lossPerUnit} onChange={(e) => setLossPerUnit(+e.target.value)} />
      </Field>

      {rets.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="総返品数" value={`${calc.totalQty}`} />
            <Stat label="対象SKU数" value={`${calc.rows.length}`} />
            <Stat label="推定損失合計" value={yen(calc.totalLoss)} tone="bad" />
          </div>

          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold">返品理由の内訳</p>
            {calc.reasonSorted.slice(0, 8).map(([reason, n]) => {
              const w = calc.totalQty ? (n / calc.totalQty) * 100 : 0;
              return (
                <div key={reason} className="mb-1 flex items-center gap-2 text-xs">
                  <span className="w-40 shrink-0 truncate">{reason}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-[var(--surface-soft)]">
                    <div className="h-full bg-[#e47911]" style={{ width: `${w}%` }} />
                  </div>
                  <span className="w-16 text-right">
                    {n}（{w.toFixed(0)}%）
                  </span>
                </div>
              );
            })}
          </div>

          <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
            SKU別 分析CSV
          </button>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-[var(--muted)]">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">返品数</th>
                  <th className="py-2 pr-3">返品率</th>
                  <th className="py-2 pr-3">主な理由</th>
                  <th className="py-2 pr-3">推定損失</th>
                </tr>
              </thead>
              <tbody>
                {calc.rows.slice(0, 40).map((r) => (
                  <tr key={r.sku} className="border-b">
                    <td className="py-2 pr-3 font-mono">{r.sku}</td>
                    <td className="py-2 pr-3">{r.qty}</td>
                    <td
                      className="py-2 pr-3"
                      style={{ color: r.rate != null && r.rate > 0.1 ? "#bf0000" : r.rate != null && r.rate > 0.05 ? "#a1701c" : undefined }}
                    >
                      {r.rate != null ? `${(r.rate * 100).toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-2 pr-3">{r.topReason}</td>
                    <td className="py-2 pr-3">{yen(r.loss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ToolShell>
  );
}
