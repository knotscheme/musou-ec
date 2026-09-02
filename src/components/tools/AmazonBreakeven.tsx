"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

/**
 * Amazon公式FBA料金シミュレーターが扱わない「広告ACoS込みの損益分岐」を出す。
 */
export default function AmazonBreakeven() {
  const [price, setPrice] = useState(3480);
  const [cost, setCost] = useState(1200);
  const [inbound, setInbound] = useState(150); // 納品送料など自社負担/個
  const [fbaFee, setFbaFee] = useState(434); // 配送代行手数料/個
  const [referralRate, setReferralRate] = useState(10); // 販売手数料率(%)
  const [returnRate, setReturnRate] = useState(3); // 返品・不良引当(%)
  const [targetMargin, setTargetMargin] = useState(15); // 目標利益率(%)

  const r = useMemo(() => {
    const referral = price * (referralRate / 100);
    const returnLoss = price * (returnRate / 100) * 0.5; // 返品の実損は概算50%
    const unitProfitNoAd = price - referral - fbaFee - cost - inbound - returnLoss;
    const marginNoAd = price > 0 ? unitProfitNoAd / price : 0;

    const beAcos = price > 0 ? unitProfitNoAd / price : 0; // これを超える広告費率で赤字
    const beRoas = unitProfitNoAd > 0 ? price / unitProfitNoAd : 0;
    const acosForTarget = price > 0 ? (unitProfitNoAd - price * (targetMargin / 100)) / price : 0;

    // 値下げ耐性: profit(p) = p - p*ref - p*ret*0.5 - fbaFee - cost - inbound = 0
    const k = 1 - referralRate / 100 - (returnRate / 100) * 0.5;
    const floorPrice = k > 0 ? (fbaFee + cost + inbound) / k : 0;

    return { referral, returnLoss, unitProfitNoAd, marginNoAd, beAcos, beRoas, acosForTarget, floorPrice };
  }, [price, cost, inbound, fbaFee, referralRate, returnRate, targetMargin]);

  const tone = r.unitProfitNoAd < 0 ? "bad" : r.marginNoAd < 0.1 ? "warn" : "ok";

  return (
    <ToolShell slug="amazon-breakeven">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="販売価格（税込・円）">
          <NumberInput value={price} onChange={(e) => setPrice(+e.target.value)} />
        </Field>
        <Field label="商品原価（円）">
          <NumberInput value={cost} onChange={(e) => setCost(+e.target.value)} />
        </Field>
        <Field label="納品送料など自社負担（円/個）">
          <NumberInput value={inbound} onChange={(e) => setInbound(+e.target.value)} />
        </Field>
        <Field label="FBA配送代行手数料（円/個）" hint="公式シミュレーターの値を転記">
          <NumberInput value={fbaFee} onChange={(e) => setFbaFee(+e.target.value)} />
        </Field>
        <Field label="販売手数料率（%）">
          <NumberInput value={referralRate} onChange={(e) => setReferralRate(+e.target.value)} />
        </Field>
        <Field label="返品・不良引当（%）">
          <NumberInput value={returnRate} onChange={(e) => setReturnRate(+e.target.value)} />
        </Field>
        <Field label="目標利益率（%）">
          <NumberInput value={targetMargin} onChange={(e) => setTargetMargin(+e.target.value)} />
        </Field>
      </div>

      {r.unitProfitNoAd < 0 && (
        <div
          className="rounded-lg border-2 p-3 text-sm font-semibold"
          style={{ borderColor: "#bf0000", color: "#bf0000" }}
        >
          ⚠ 広告費ゼロでも赤字（{yen(r.unitProfitNoAd)}/個）。原価・価格の見直しが必要。
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="販売手数料" value={`- ${yen(r.referral)}`} />
        <Stat label="返品実損（概算）" value={`- ${yen(r.returnLoss)}`} />
        <Stat label="広告前 利益/個" value={yen(r.unitProfitNoAd)} tone={tone} />
        <Stat label="広告前 利益率" value={`${(r.marginNoAd * 100).toFixed(1)}%`} tone={tone} />
        <Stat label="損益分岐ACoS" value={`${(r.beAcos * 100).toFixed(1)}%`} accent />
        <Stat label="損益分岐ROAS" value={`${(r.beRoas * 100).toFixed(0)}%`} />
        <Stat
          label={`目標利益率${targetMargin}%を残すACoS`}
          value={`${(r.acosForTarget * 100).toFixed(1)}%`}
          tone={r.acosForTarget > 0 ? "ok" : "bad"}
        />
        <Stat label="値下げ耐性（下限価格）" value={yen(r.floorPrice)} />
      </div>

      <button
        onClick={() =>
          recordHistory(
            "amazon-breakeven",
            `損益分岐ACoS ${(r.beAcos * 100).toFixed(1)}%`,
            `広告前利益/個 ${yen(r.unitProfitNoAd)} / 下限価格 ${yen(r.floorPrice)}`,
          )
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
