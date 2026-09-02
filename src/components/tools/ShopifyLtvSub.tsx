"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

/**
 * 定期購入（サブスク）の LTV と、広告の許容CPA を試算。
 * 継続回数は「月次継続率」から 1/(1-r) で概算するか、直接入力。
 */
export default function ShopifyLtvSub() {
  const [firstPrice, setFirstPrice] = useState(2000); // 初回価格（割引後）
  const [recurPrice, setRecurPrice] = useState(3200); // 2回目以降の価格
  const [marginRate, setMarginRate] = useState(45); // 粗利率(%)（原価・送料・決済除く後）
  const [useRetention, setUseRetention] = useState(true);
  const [retention, setRetention] = useState(80); // 月次継続率(%)
  const [manualCount, setManualCount] = useState(6); // 平均継続回数（直接入力）
  const [ratio, setRatio] = useState(3); // 目標 LTV / CAC

  const r = useMemo(() => {
    const rr = retention / 100;
    const count = useRetention ? (rr < 1 ? 1 / (1 - rr) : 24) : manualCount;
    const m = marginRate / 100;
    const revenue = firstPrice + recurPrice * Math.max(0, count - 1);
    const ltvGross = revenue * m;
    const firstGross = firstPrice * m;
    const allowedCpaMax = ltvGross; // 上限（回収期間無視）
    const allowedCpaTarget = ltvGross / ratio; // 目標LTV/CAC
    const firstDeficitAllowance = ltvGross - firstGross; // 初回いくらまで赤字にできるか
    return { count, revenue, ltvGross, firstGross, allowedCpaMax, allowedCpaTarget, firstDeficitAllowance };
  }, [firstPrice, recurPrice, marginRate, useRetention, retention, manualCount, ratio]);

  return (
    <ToolShell slug="shopify-ltv-sub">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="初回価格（割引後・円）">
          <NumberInput value={firstPrice} onChange={(e) => setFirstPrice(+e.target.value)} />
        </Field>
        <Field label="2回目以降の価格（円）">
          <NumberInput value={recurPrice} onChange={(e) => setRecurPrice(+e.target.value)} />
        </Field>
        <Field label="粗利率（%）" hint="原価・送料・決済手数料を引いた後">
          <NumberInput value={marginRate} onChange={(e) => setMarginRate(+e.target.value)} />
        </Field>
        <Field label="目標 LTV / CAC 倍率">
          <NumberInput value={ratio} step={0.5} onChange={(e) => setRatio(+e.target.value)} />
        </Field>
      </div>

      <div className="card p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={useRetention}
            onChange={(e) => setUseRetention(e.target.checked)}
          />
          月次継続率から継続回数を推定する
        </label>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {useRetention ? (
            <Field label="月次継続率（%）" hint="継続回数 ≒ 1 / (1 − 継続率)">
              <NumberInput value={retention} onChange={(e) => setRetention(+e.target.value)} />
            </Field>
          ) : (
            <Field label="平均継続回数（回）">
              <NumberInput value={manualCount} onChange={(e) => setManualCount(+e.target.value)} />
            </Field>
          )}
          <Stat label="想定 平均継続回数" value={`${r.count.toFixed(1)} 回`} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="累計売上（1顧客）" value={yen(r.revenue)} />
        <Stat label="LTV（粗利ベース）" value={yen(r.ltvGross)} accent />
        <Stat label="初回粗利" value={yen(r.firstGross)} />
        <Stat label="許容CPA 上限" value={yen(r.allowedCpaMax)} />
        <Stat label={`許容CPA（LTV/CAC=${ratio}）`} value={yen(r.allowedCpaTarget)} tone="ok" />
        <Stat label="初回の赤字許容額" value={yen(r.firstDeficitAllowance)} />
      </div>

      <button
        onClick={() =>
          recordHistory(
            "shopify-ltv-sub",
            `LTV粗利 ${yen(r.ltvGross)}`,
            `継続${r.count.toFixed(1)}回 / 許容CPA ${yen(r.allowedCpaTarget)}`,
          )
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
