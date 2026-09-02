"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader, findCol, num } from "@/lib/csvmap";
import { MALLS, MALL_ORDER, type MallId } from "@/lib/malls";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

interface Line {
  mall: MallId;
  sku: string;
  name: string;
  qty: number;
  revenue: number;
}
interface Source {
  id: number;
  mall: MallId;
  feeRate: number;
  fileName: string;
  lines: Line[];
}

const DEFAULT_FEE: Record<MallId, number> = {
  rakuten: 12,
  yahoo: 9,
  amazon: 15,
  shopify: 4,
  common: 10,
};

export default function ProfitDashboard() {
  const [sources, setSources] = useState<Source[]>([]);
  const [costMap, setCostMap] = useState<Map<string, number>>(new Map());
  const [nextId, setNextId] = useState(1);

  function addSource(mall: MallId, file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iSku = findCol(header, ["sku", "商品コード", "商品番号", "商品管理番号", "jan", "seller-sku"]);
      const iName = findCol(header, ["商品名", "item-name", "title", "name", "商品名称"]);
      const iQty = findCol(header, ["数量", "quantity", "販売数", "個数", "点数"]);
      const iRev = findCol(header, ["売上", "売上金額", "商品代金", "金額", "item-price", "販売価格", "小計"]);
      const lines: Line[] = rows.map((r) => ({
        mall,
        sku: (iSku >= 0 ? r[iSku] : r[0]) || "(不明)",
        name: iName >= 0 ? r[iName] ?? "" : "",
        qty: iQty >= 0 ? num(r[iQty]) || 1 : 1,
        revenue: iRev >= 0 ? num(r[iRev]) : 0,
      }));
      setSources((s) => [
        ...s,
        { id: nextId, mall, feeRate: DEFAULT_FEE[mall], fileName: file.name, lines },
      ]);
      setNextId((n) => n + 1);
    });
  }

  function onCost(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iSku = findCol(header, ["sku", "商品コード", "商品番号", "jan"]);
      const iCost = findCol(header, ["原価", "cost", "仕入価格", "仕入原価"]);
      const m = new Map<string, number>();
      for (const r of rows) {
        const sku = iSku >= 0 ? r[iSku] : r[0];
        if (sku) m.set(sku, iCost >= 0 ? num(r[iCost]) : 0);
      }
      setCostMap(m);
    });
  }

  const perMall = useMemo(() => {
    const acc: Record<string, { revenue: number; fee: number; cost: number; qty: number }> = {};
    for (const s of sources) {
      const k = String(s.mall);
      acc[k] = acc[k] ?? { revenue: 0, fee: 0, cost: 0, qty: 0 };
      for (const l of s.lines) {
        acc[k].revenue += l.revenue;
        acc[k].fee += l.revenue * (s.feeRate / 100);
        acc[k].qty += l.qty;
        acc[k].cost += (costMap.get(l.sku) ?? 0) * l.qty;
      }
    }
    return acc;
  }, [sources, costMap]);

  const products = useMemo(() => {
    const map = new Map<string, { sku: string; name: string; byMall: Record<string, number>; total: number; profit: number }>();
    for (const s of sources) {
      for (const l of s.lines) {
        const cur = map.get(l.sku) ?? { sku: l.sku, name: l.name, byMall: {}, total: 0, profit: 0 };
        cur.byMall[s.mall] = (cur.byMall[s.mall] ?? 0) + l.revenue;
        cur.total += l.revenue;
        cur.profit += l.revenue - l.revenue * (s.feeRate / 100) - (costMap.get(l.sku) ?? 0) * l.qty;
        if (!cur.name && l.name) cur.name = l.name;
        map.set(l.sku, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [sources, costMap]);

  const totals = useMemo(() => {
    let revenue = 0, fee = 0, cost = 0;
    for (const k of Object.keys(perMall)) {
      revenue += perMall[k].revenue;
      fee += perMall[k].fee;
      cost += perMall[k].cost;
    }
    const profit = revenue - fee - cost;
    return { revenue, fee, cost, profit, margin: revenue ? profit / revenue : 0 };
  }, [perMall]);

  const usedMalls = MALL_ORDER.filter((m) => perMall[m]);

  function exportCsv() {
    downloadCSV("profit-dashboard", [
      ["SKU", "商品名", ...usedMalls.map((m) => MALLS[m].label + "売上"), "合計売上", "推定粗利"],
      ...products.map((p) => [
        p.sku, p.name,
        ...usedMalls.map((m) => Math.round(p.byMall[m] ?? 0)),
        Math.round(p.total), Math.round(p.profit),
      ]),
    ]);
    recordHistory("profit-dashboard", `粗利 ${yen(totals.profit)}`, `${sources.length}ソース / ${products.length}商品`);
  }

  return (
    <ToolShell slug="profit-dashboard">
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">データソースを追加（モールごとに売上CSV）</p>
        <div className="flex flex-wrap gap-2">
          {(["rakuten", "yahoo", "amazon", "shopify"] as MallId[]).map((m) => (
            <label
              key={m}
              className="cursor-pointer rounded-md border px-3 py-2 text-sm font-semibold"
              style={{ borderColor: MALLS[m].color, color: MALLS[m].color }}
            >
              + {MALLS[m].label}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  addSource(m, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Field label="原価CSV（任意 / SKU,原価）">
            <input type="file" accept=".csv" onChange={(e) => onCost(e.target.files?.[0])} className="text-sm" />
          </Field>
        </div>
      </div>

      {sources.length > 0 && (
        <>
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{ background: MALLS[s.mall].colorSoft, color: MALLS[s.mall].color }}>
                  {MALLS[s.mall].label}
                </span>
                <span className="flex-1 truncate text-[var(--muted)]">{s.fileName}（{s.lines.length}行）</span>
                <label className="flex items-center gap-1">
                  手数料率
                  <NumberInput
                    value={s.feeRate}
                    onChange={(e) =>
                      setSources((arr) => arr.map((x) => (x.id === s.id ? { ...x, feeRate: +e.target.value } : x)))
                    }
                    className="w-20"
                  />
                  %
                </label>
                <button
                  onClick={() => setSources((arr) => arr.filter((x) => x.id !== s.id))}
                  className="rounded-md border px-2 py-1 text-xs"
                >
                  削除
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="総売上" value={yen(totals.revenue)} />
            <Stat label="手数料合計" value={`- ${yen(totals.fee)}`} />
            <Stat label="推定粗利" value={yen(totals.profit)} tone={totals.profit < 0 ? "bad" : "ok"} />
            <Stat label="粗利率" value={`${(totals.margin * 100).toFixed(1)}%`} tone={totals.margin < 0.05 ? "warn" : "ok"} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {usedMalls.map((m) => {
              const d = perMall[m];
              const profit = d.revenue - d.fee - d.cost;
              return (
                <div key={m} className="card mall-bar p-3" style={{ ["--mall" as string]: MALLS[m].color }}>
                  <div className="text-xs font-semibold" style={{ color: MALLS[m].color }}>
                    {MALLS[m].label}
                  </div>
                  <div className="mt-1 text-sm">売上 {yen(d.revenue)}</div>
                  <div className="text-sm">粗利 {yen(profit)}</div>
                  <div className="text-xs text-[var(--muted)]">
                    率 {d.revenue ? ((profit / d.revenue) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
            串刺しCSVを出力
          </button>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-[var(--muted)]">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">商品名</th>
                  {usedMalls.map((m) => (
                    <th key={m} className="py-2 pr-3" style={{ color: MALLS[m].color }}>
                      {MALLS[m].label}
                    </th>
                  ))}
                  <th className="py-2 pr-3">合計</th>
                  <th className="py-2 pr-3">粗利</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 40).map((p) => (
                  <tr key={p.sku} className="border-b">
                    <td className="py-2 pr-3 font-mono">{p.sku}</td>
                    <td className="py-2 pr-3">{p.name.slice(0, 24)}</td>
                    {usedMalls.map((m) => (
                      <td key={m} className="py-2 pr-3">
                        {p.byMall[m] ? yen(p.byMall[m]) : "—"}
                      </td>
                    ))}
                    <td className="py-2 pr-3 font-semibold">{yen(p.total)}</td>
                    <td className="py-2 pr-3" style={{ color: p.profit < 0 ? "#bf0000" : undefined }}>
                      {yen(p.profit)}
                    </td>
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
