"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

/** ポイント/ロイヤルティ施策の原資と ROI を試算。 */
export default function ShopifyLoyalty() {
  const [annualSales, setAnnualSales] = useState(12_000_000);
  const [marginRate, setMarginRate] = useState(45); // 粗利率%
  const [grantRate, setGrantRate] = useState(3); // 付与率%
  const [redeemRate, setRedeemRate] = useState(70); // 発行ポイントの利用率%
  const [reviewPointYen, setReviewPointYen] = useState(120_000); // レビュー等の追加発行（年間見込み・円）
  const [repeatLift, setRepeatLift] = useState(4); // リピート押し上げ（売上比 %pt）

  const r = useMemo(() => {
    const issued = annualSales * (grantRate / 100) + reviewPointYen;
    const cost = issued * (redeemRate / 100); // 利用されたポイント＝実質値引き
    const extraSales = annualSales * (repeatLift / 100);
    const extraGross = extraSales * (marginRate / 100);
    const netEffect = extraGross - cost;
    const roi = cost > 0 ? netEffect / cost : 0;
    // 損益分岐リピート押し上げ%: extraSales*margin = cost
    const breakevenLift = annualSales * (marginRate / 100) > 0 ? (cost / (annualSales * (marginRate / 100))) * 100 : 0;
    return { issued, cost, extraSales, extraGross, netEffect, roi, breakevenLift };
  }, [annualSales, marginRate, grantRate, redeemRate, reviewPointYen, repeatLift]);

  const tone = r.netEffect > 0 ? "ok" : "bad";

  return (
    <ToolShell slug="shopify-loyalty">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="年間対象売上（円）">
          <NumberInput value={annualSales} onChange={(e) => setAnnualSales(+e.target.value)} />
        </Field>
        <Field label="粗利率（%）">
          <NumberInput value={marginRate} onChange={(e) => setMarginRate(+e.target.value)} />
        </Field>
        <Field label="ポイント付与率（%）">
          <NumberInput value={grantRate} onChange={(e) => setGrantRate(+e.target.value)} />
        </Field>
        <Field label="発行ポイントの利用率（%）">
          <NumberInput value={redeemRate} onChange={(e) => setRedeemRate(+e.target.value)} />
        </Field>
        <Field label="レビュー等の追加発行（年間・円）">
          <NumberInput value={reviewPointYen} onChange={(e) => setReviewPointYen(+e.target.value)} />
        </Field>
        <Field label="リピート押し上げ（売上比・%pt）" hint="施策で増える年間売上の割合">
          <NumberInput value={repeatLift} onChange={(e) => setRepeatLift(+e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="年間 発行ポイント" value={yen(r.issued)} />
        <Stat label="年間 原資（利用分）" value={`- ${yen(r.cost)}`} tone="warn" />
        <Stat label="追加売上（想定）" value={yen(r.extraSales)} />
        <Stat label="追加粗利" value={yen(r.extraGross)} />
        <Stat label="純効果" value={yen(r.netEffect)} tone={tone} />
        <Stat label="ROI" value={`${(r.roi * 100).toFixed(0)}%`} tone={tone} />
        <Stat label="損益分岐リピート押し上げ" value={`${r.breakevenLift.toFixed(2)} %pt`} accent />
      </div>

      <div className="card p-4 text-sm">
        {r.netEffect > 0 ? (
          <p style={{ color: "#1a8a5a" }}>
            想定どおりリピートが {repeatLift}%pt 増えれば黒字。損益分岐は {r.breakevenLift.toFixed(2)}%pt なので余裕があります。
          </p>
        ) : (
          <p style={{ color: "#bf0000" }}>
            現条件では原資が効果を上回ります。付与率か利用率を下げるか、リピート押し上げが {r.breakevenLift.toFixed(2)}%pt 以上必要。
          </p>
        )}
      </div>

      <button
        onClick={() =>
          recordHistory("shopify-loyalty", `ROI ${(r.roi * 100).toFixed(0)}%`, `原資${yen(r.cost)} / 純効果${yen(r.netEffect)}`)
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
