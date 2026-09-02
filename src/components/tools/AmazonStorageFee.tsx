"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

/**
 * FBA 在庫保管手数料＋長期在庫保管手数料の概算。
 * 料率は Amazon 側で改定されるため入力で上書き可能にしている。
 */
export default function AmazonStorageFee() {
  const [w, setW] = useState(30);
  const [d, setD] = useState(20);
  const [h, setH] = useState(10);
  const [qty, setQty] = useState(100);
  const [months, setMonths] = useState(4);
  const [peak, setPeak] = useState(false); // 10-12月
  const [size, setSize] = useState<"standard" | "oversize">("standard");
  // 料率（円 / m³ / 月）。既定は概算値。
  const [rateStdNormal, setRateStdNormal] = useState(5160);
  const [rateStdPeak, setRateStdPeak] = useState(9170);
  const [rateOvNormal, setRateOvNormal] = useState(4370);
  const [rateOvPeak, setRateOvPeak] = useState(7760);
  // 長期在庫保管手数料（271日以上）: 円 / m³ / 月 の追加
  const [longTermRate, setLongTermRate] = useState(17773);
  const [storageDays, setStorageDays] = useState(90);

  const r = useMemo(() => {
    const m3 = (w * d * h) / 1_000_000; // cm³ → m³
    const totalM3 = m3 * qty;
    const monthlyRate =
      size === "standard"
        ? peak
          ? rateStdPeak
          : rateStdNormal
        : peak
          ? rateOvPeak
          : rateOvNormal;
    const monthlyFee = totalM3 * monthlyRate;
    const periodFee = monthlyFee * months;
    const longTerm = storageDays > 270 ? totalM3 * longTermRate : 0;
    const perUnitTotal = qty > 0 ? (periodFee + longTerm) / qty : 0;
    return { m3, totalM3, monthlyRate, monthlyFee, periodFee, longTerm, perUnitTotal };
  }, [
    w, d, h, qty, months, peak, size,
    rateStdNormal, rateStdPeak, rateOvNormal, rateOvPeak, longTermRate, storageDays,
  ]);

  return (
    <ToolShell slug="amazon-storage-fee">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="1個の幅 W（cm）">
          <NumberInput value={w} onChange={(e) => setW(+e.target.value)} />
        </Field>
        <Field label="奥行 D（cm）">
          <NumberInput value={d} onChange={(e) => setD(+e.target.value)} />
        </Field>
        <Field label="高さ H（cm）">
          <NumberInput value={h} onChange={(e) => setH(+e.target.value)} />
        </Field>
        <Field label="在庫数">
          <NumberInput value={qty} onChange={(e) => setQty(+e.target.value)} />
        </Field>
        <Field label="保管月数">
          <NumberInput value={months} onChange={(e) => setMonths(+e.target.value)} />
        </Field>
        <Field label="累計保管日数" hint="271日超で長期在庫保管手数料">
          <NumberInput value={storageDays} onChange={(e) => setStorageDays(+e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1">
          <span>サイズ区分</span>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as "standard" | "oversize")}
            className="rounded-md border px-2 py-1"
          >
            <option value="standard">標準</option>
            <option value="oversize">大型</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={peak} onChange={(e) => setPeak(e.target.checked)} />
          繁忙期（10〜12月）料率
        </label>
      </div>

      <details className="card p-3 text-sm">
        <summary className="cursor-pointer font-semibold">料率（円/m³/月）を調整</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="標準・通常期"><NumberInput value={rateStdNormal} onChange={(e) => setRateStdNormal(+e.target.value)} /></Field>
          <Field label="標準・繁忙期"><NumberInput value={rateStdPeak} onChange={(e) => setRateStdPeak(+e.target.value)} /></Field>
          <Field label="大型・通常期"><NumberInput value={rateOvNormal} onChange={(e) => setRateOvNormal(+e.target.value)} /></Field>
          <Field label="大型・繁忙期"><NumberInput value={rateOvPeak} onChange={(e) => setRateOvPeak(+e.target.value)} /></Field>
          <Field label="長期在庫保管手数料（271日〜）"><NumberInput value={longTermRate} onChange={(e) => setLongTermRate(+e.target.value)} /></Field>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          ※ 概算の既定値です。最新の料率は Amazon の手数料ページで確認してください。
        </p>
      </details>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="1個の体積" value={`${(r.m3 * 1000).toFixed(2)} L`} />
        <Stat label="適用料率" value={`${yen(r.monthlyRate)} /m³/月`} />
        <Stat label="月額保管料（全在庫）" value={yen(r.monthlyFee)} />
        <Stat label={`保管料 ${months}ヶ月分`} value={yen(r.periodFee)} />
        <Stat label="長期在庫保管手数料" value={yen(r.longTerm)} tone={r.longTerm > 0 ? "bad" : "ok"} />
        <Stat label="在庫1個あたり総保管コスト" value={yen(r.perUnitTotal)} accent />
      </div>

      <button
        onClick={() =>
          recordHistory(
            "amazon-storage-fee",
            `1個あたり ${yen(r.perUnitTotal)}`,
            `${qty}個 × ${months}ヶ月 / 長期 ${yen(r.longTerm)}`,
          )
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
