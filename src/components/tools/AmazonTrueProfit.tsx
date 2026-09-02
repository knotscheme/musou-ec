"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader, findCol, num } from "@/lib/csvmap";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

interface Agg {
  sku: string;
  name: string;
  qty: number;
  revenue: number;
  cost: number;
  fba: number;
}

export default function AmazonTrueProfit() {
  const [sales, setSales] = useState<Agg[]>([]);
  const [refRate, setRefRate] = useState(10);
  const [adTotal, setAdTotal] = useState(0);
  const [returnRate, setReturnRate] = useState(3);
  const [storageTotal, setStorageTotal] = useState(0);
  const [otherPerUnit, setOtherPerUnit] = useState(0);

  function onSales(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iSku = findCol(header, ["sku", "seller-sku", "出品者SKU", "商品番号"]);
      const iName = findCol(header, ["商品名", "item-name", "product-name", "title", "タイトル"]);
      const iQty = findCol(header, ["数量", "quantity", "quantity-purchased", "販売数", "個数", "shipped-quantity"]);
      const iRev = findCol(header, ["商品代金", "item-price", "売上", "売上金額", "principal", "商品売上", "税抜金額"]);
      const iCost = findCol(header, ["原価", "cost", "仕入価格", "仕入原価"]);
      const iFba = findCol(header, ["fba手数料", "配送代行手数料", "fba-fee", "fulfillment-fee"]);
      const map = new Map<string, Agg>();
      for (const r of rows) {
        const sku = (iSku >= 0 ? r[iSku] : r[0]) || "(不明)";
        const key = sku;
        const cur = map.get(key) ?? {
          sku,
          name: iName >= 0 ? r[iName] ?? "" : "",
          qty: 0,
          revenue: 0,
          cost: iCost >= 0 ? num(r[iCost]) : 0,
          fba: iFba >= 0 ? num(r[iFba]) : 0,
        };
        cur.qty += iQty >= 0 ? num(r[iQty]) || 1 : 1;
        cur.revenue += iRev >= 0 ? num(r[iRev]) : 0;
        if (!cur.name && iName >= 0) cur.name = r[iName] ?? "";
        map.set(key, cur);
      }
      setSales([...map.values()].filter((a) => a.revenue > 0 || a.qty > 0));
    });
  }

  function onCost(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iSku = findCol(header, ["sku", "seller-sku", "商品コード", "商品番号"]);
      const iCost = findCol(header, ["原価", "cost", "仕入価格", "仕入原価"]);
      const iFba = findCol(header, ["fba手数料", "配送代行手数料", "fba-fee"]);
      const cm = new Map<string, { cost: number; fba: number }>();
      for (const r of rows) {
        const sku = iSku >= 0 ? r[iSku] : r[0];
        if (!sku) continue;
        cm.set(sku, { cost: iCost >= 0 ? num(r[iCost]) : 0, fba: iFba >= 0 ? num(r[iFba]) : 0 });
      }
      setSales((prev) =>
        prev.map((a) => {
          const c = cm.get(a.sku);
          return c ? { ...a, cost: c.cost || a.cost, fba: c.fba || a.fba } : a;
        }),
      );
    });
  }

  const calc = useMemo(() => {
    const totalRev = sales.reduce((s, a) => s + a.revenue, 0) || 1;
    const rows = sales.map((a) => {
      const referral = a.revenue * (refRate / 100);
      const ad = adTotal * (a.revenue / totalRev);
      const storage = storageTotal * (a.revenue / totalRev);
      const costTotal = a.cost * a.qty;
      const fbaTotal = a.fba * a.qty;
      const returnLoss = a.revenue * (returnRate / 100) * 0.5;
      const other = otherPerUnit * a.qty;
      const profit = a.revenue - referral - ad - storage - costTotal - fbaTotal - returnLoss - other;
      const margin = a.revenue > 0 ? profit / a.revenue : 0;
      return { ...a, referral, ad, storage, costTotal, fbaTotal, returnLoss, other, profit, margin };
    });
    rows.sort((x, y) => x.profit - y.profit);
    const t = rows.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.revenue,
        profit: acc.profit + r.profit,
        ad: acc.ad + r.ad,
        referral: acc.referral + r.referral,
      }),
      { revenue: 0, profit: 0, ad: 0, referral: 0 },
    );
    return { rows, t, margin: t.revenue ? t.profit / t.revenue : 0, lossCount: rows.filter((r) => r.profit < 0).length };
  }, [sales, refRate, adTotal, returnRate, storageTotal, otherPerUnit]);

  function exportCsv() {
    downloadCSV("amazon-true-profit", [
      ["SKU", "商品名", "数量", "売上", "販売手数料", "広告費(按分)", "保管費(按分)", "原価計", "FBA計", "返品損", "実利益", "実利益率"],
      ...calc.rows.map((r) => [
        r.sku, r.name, r.qty, Math.round(r.revenue), Math.round(r.referral), Math.round(r.ad),
        Math.round(r.storage), Math.round(r.costTotal), Math.round(r.fbaTotal), Math.round(r.returnLoss),
        Math.round(r.profit), `${(r.margin * 100).toFixed(1)}%`,
      ]),
    ]);
    recordHistory("amazon-true-profit", `実利益 ${yen(calc.t.profit)}`, `${calc.rows.length}SKU / 赤字${calc.lossCount}`);
  }

  return (
    <ToolShell slug="amazon-true-profit">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="売上レポートCSV" hint="SKU / 商品名 / 数量 / 売上 列を自動検出">
          <input type="file" accept=".csv" onChange={(e) => onSales(e.target.files?.[0])} className="text-sm" />
        </Field>
        <Field label="原価・FBA手数料CSV（任意 / SKU,原価,FBA手数料）">
          <input type="file" accept=".csv" onChange={(e) => onCost(e.target.files?.[0])} className="text-sm" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="販売手数料率（%）">
          <NumberInput value={refRate} onChange={(e) => setRefRate(+e.target.value)} />
        </Field>
        <Field label="広告費 合計（期間・円）" hint="売上比で按分">
          <NumberInput value={adTotal} onChange={(e) => setAdTotal(+e.target.value)} />
        </Field>
        <Field label="保管費 合計（期間・円）">
          <NumberInput value={storageTotal} onChange={(e) => setStorageTotal(+e.target.value)} />
        </Field>
        <Field label="返品率（%）">
          <NumberInput value={returnRate} onChange={(e) => setReturnRate(+e.target.value)} />
        </Field>
        <Field label="その他コスト（円/個）">
          <NumberInput value={otherPerUnit} onChange={(e) => setOtherPerUnit(+e.target.value)} />
        </Field>
      </div>

      {sales.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="売上合計" value={yen(calc.t.revenue)} />
            <Stat label="実利益合計" value={yen(calc.t.profit)} tone={calc.t.profit < 0 ? "bad" : "ok"} />
            <Stat label="実利益率" value={`${(calc.margin * 100).toFixed(1)}%`} tone={calc.margin < 0.05 ? "warn" : "ok"} />
            <Stat label="赤字SKU数" value={`${calc.lossCount}`} tone={calc.lossCount ? "bad" : "ok"} />
          </div>

          <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
            明細CSVを出力
          </button>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-[var(--muted)]">
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">数量</th>
                  <th className="py-2 pr-3">売上</th>
                  <th className="py-2 pr-3">手数料</th>
                  <th className="py-2 pr-3">広告(按分)</th>
                  <th className="py-2 pr-3">原価計</th>
                  <th className="py-2 pr-3">実利益</th>
                  <th className="py-2 pr-3">率</th>
                </tr>
              </thead>
              <tbody>
                {calc.rows.slice(0, 40).map((r) => (
                  <tr key={r.sku} className="border-b">
                    <td className="py-2 pr-3 font-mono">{r.sku}</td>
                    <td className="py-2 pr-3">{r.qty}</td>
                    <td className="py-2 pr-3">{yen(r.revenue)}</td>
                    <td className="py-2 pr-3">{yen(r.referral)}</td>
                    <td className="py-2 pr-3">{yen(r.ad)}</td>
                    <td className="py-2 pr-3">{yen(r.costTotal)}</td>
                    <td className="py-2 pr-3 font-semibold" style={{ color: r.profit < 0 ? "#bf0000" : "#1a8a5a" }}>
                      {yen(r.profit)}
                    </td>
                    <td className="py-2 pr-3" style={{ color: r.margin < 0 ? "#bf0000" : undefined }}>
                      {(r.margin * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--muted)]">実利益の低い順に表示。原価が未設定のSKUは原価0で計算されます。</p>
        </>
      )}
    </ToolShell>
  );
}
