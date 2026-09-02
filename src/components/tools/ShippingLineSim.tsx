"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

/**
 * 送料無料ライン設定の利益影響を試算。
 * 「ライン設定で客単価が上がる」効果と「ライン到達注文の送料店舗負担」を比較する。
 */
export default function ShippingLineSim() {
  const [aov, setAov] = useState(3800); // 現在の平均客単価
  const [marginRate, setMarginRate] = useState(35); // 粗利率%（送料除く）
  const [shipCost, setShipCost] = useState(600); // 送料実費/件（店舗負担時）
  const [line, setLine] = useState(5000); // 検討中の送料無料ライン
  const [aovLift, setAovLift] = useState(12); // ライン導入時の客単価上昇率%
  const [reachRate, setReachRate] = useState(45); // 無料ラインを超える注文の割合%

  const r = useMemo(() => {
    const newAov = aov * (1 + aovLift / 100);
    const shipBurdenPerOrder = (reachRate / 100) * shipCost; // ライン以上は店舗が送料負担
    const grossBefore = aov * (marginRate / 100); // 送料は顧客負担の前提
    const grossAfter = newAov * (marginRate / 100) - shipBurdenPerOrder;
    const diff = grossAfter - grossBefore;
    // 損益分岐の客単価上昇率: newAov*m - burden = grossBefore
    const breakevenLift =
      aov * (marginRate / 100) > 0
        ? ((grossBefore + shipBurdenPerOrder) / (marginRate / 100) / aov - 1) * 100
        : 0;
    return { newAov, shipBurdenPerOrder, grossBefore, grossAfter, diff, breakevenLift };
  }, [aov, marginRate, shipCost, aovLift, reachRate]);

  const tone = r.diff > 0 ? "ok" : "bad";

  return (
    <ToolShell slug="shipping-line-sim">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="現在の平均客単価（円）">
          <NumberInput value={aov} onChange={(e) => setAov(+e.target.value)} />
        </Field>
        <Field label="粗利率（%）" hint="送料を除いた商品粗利率">
          <NumberInput value={marginRate} onChange={(e) => setMarginRate(+e.target.value)} />
        </Field>
        <Field label="送料実費（円/件）">
          <NumberInput value={shipCost} onChange={(e) => setShipCost(+e.target.value)} />
        </Field>
        <Field label="検討中の送料無料ライン（円）">
          <NumberInput value={line} onChange={(e) => setLine(+e.target.value)} />
        </Field>
        <Field label="客単価の上昇率（%）" hint="買い足し・同梱による想定">
          <NumberInput value={aovLift} onChange={(e) => setAovLift(+e.target.value)} />
        </Field>
        <Field label="無料ライン到達率（%）" hint="ライン以上になる注文の割合">
          <NumberInput value={reachRate} onChange={(e) => setReachRate(+e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="導入後の客単価" value={yen(r.newAov)} />
        <Stat label="送料負担/注文" value={`- ${yen(r.shipBurdenPerOrder)}`} tone="warn" />
        <Stat label="粗利/注文（現状）" value={yen(r.grossBefore)} />
        <Stat label="粗利/注文（導入後）" value={yen(r.grossAfter)} tone={tone} />
        <Stat label="1注文あたり差額" value={`${r.diff >= 0 ? "+" : ""}${yen(r.diff)}`} tone={tone} />
        <Stat label="損益分岐の客単価上昇率" value={`${r.breakevenLift.toFixed(1)}%`} accent />
      </div>

      <div className="card p-4 text-sm">
        {r.diff > 0 ? (
          <p style={{ color: "#1a8a5a" }}>
            客単価が {aovLift}% 上がるなら送料無料ライン {yen(line)} はプラス。損益分岐は上昇率{" "}
            {r.breakevenLift.toFixed(1)}% です。
          </p>
        ) : (
          <p style={{ color: "#bf0000" }}>
            現条件では赤字。到達率を下げる（ライン引き上げ）か、客単価上昇率 {r.breakevenLift.toFixed(1)}% 以上が必要。
          </p>
        )}
      </div>

      <button
        onClick={() =>
          recordHistory(
            "shipping-line-sim",
            `差額 ${r.diff >= 0 ? "+" : ""}${yen(r.diff)}/注文`,
            `ライン${yen(line)} / 上昇率${aovLift}% / 到達率${reachRate}%`,
          )
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
