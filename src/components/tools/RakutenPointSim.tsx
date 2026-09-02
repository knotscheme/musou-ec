"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/**
 * 楽天ポイント施策の「店舗負担分」を試算する。
 * 通常ポイント(1倍=1%)は楽天負担、店舗が倍率を上げた差分と、
 * 店舗エントリー型のポイントアップ(スーパーSALE等)が店舗原資。
 * SPU・買い回りは楽天/他社負担のため店舗原資には含めない（顧客還元の目安として別掲）。
 */
export default function RakutenPointSim() {
  const [price, setPrice] = useState(5980);
  const [cost, setCost] = useState(2200);
  const [otherCost, setOtherCost] = useState(500);
  const [feeRate, setFeeRate] = useState(12);
  const [shopMultiplier, setShopMultiplier] = useState(3); // 店舗ポイント倍率（1=通常のみ）
  const [saleUpPoint, setSaleUpPoint] = useState(4); // スーパーSALE等 店舗負担ポイントアップ(%)
  const [customerBonusPoint, setCustomerBonusPoint] = useState(9); // SPU/買い回り等 顧客が別途受取る%(参考)

  const r = useMemo(() => {
    const shopBurdenRate = Math.max(0, shopMultiplier - 1) * 0.01 + saleUpPoint / 100;
    const shopPointCost = price * shopBurdenRate;
    const fee = price * (feeRate / 100);
    const net = price - fee - shopPointCost;
    const profit = net - cost - otherCost;
    const margin = price > 0 ? profit / price : 0;

    const customerTotalPointRate = 0.01 + shopBurdenRate + customerBonusPoint / 100;
    const customerPoints = price * customerTotalPointRate;

    return { shopBurdenRate, shopPointCost, fee, net, profit, margin, customerTotalPointRate, customerPoints };
  }, [price, cost, otherCost, feeRate, shopMultiplier, saleUpPoint, customerBonusPoint]);

  const tone = r.profit < 0 ? "bad" : r.margin < 0.05 ? "warn" : "ok";

  return (
    <ToolShell slug="rakuten-point-sim">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="販売価格（税込・円）">
          <NumberInput value={price} onChange={(e) => setPrice(+e.target.value)} />
        </Field>
        <Field label="商品原価（円）">
          <NumberInput value={cost} onChange={(e) => setCost(+e.target.value)} />
        </Field>
        <Field label="その他コスト（送料・梱包等）">
          <NumberInput value={otherCost} onChange={(e) => setOtherCost(+e.target.value)} />
        </Field>
        <Field label="楽天手数料率（%）" hint="システム利用料＋決済手数料の実効値">
          <NumberInput value={feeRate} onChange={(e) => setFeeRate(+e.target.value)} />
        </Field>
        <Field label="店舗ポイント倍率" hint="1=通常のみ（店舗負担0）／3なら+2%を店舗負担">
          <NumberInput value={shopMultiplier} onChange={(e) => setShopMultiplier(+e.target.value)} />
        </Field>
        <Field label="SALEポイントアップ（店舗負担%）" hint="スーパーSALE等でエントリーした店舗負担分">
          <NumberInput value={saleUpPoint} onChange={(e) => setSaleUpPoint(+e.target.value)} />
        </Field>
        <Field label="SPU・買い回り等（%・参考）" hint="楽天/他社負担。顧客が別途受け取る分">
          <NumberInput
            value={customerBonusPoint}
            onChange={(e) => setCustomerBonusPoint(+e.target.value)}
          />
        </Field>
      </div>

      {r.profit < 0 && (
        <div
          className="rounded-lg border-2 p-3 text-sm font-semibold"
          style={{ borderColor: "#bf0000", color: "#bf0000" }}
        >
          ⚠ 店舗負担ポイントを含めると赤字です（粗利 {yen(r.profit)}）。
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="店舗負担ポイント率" value={pct(r.shopBurdenRate)} />
        <Stat label="店舗ポイント原資" value={`- ${yen(r.shopPointCost)}`} tone="warn" />
        <Stat label="楽天手数料" value={`- ${yen(r.fee)}`} />
        <Stat label="店舗手取り" value={yen(r.net)} />
        <Stat label="粗利" value={yen(r.profit)} tone={tone} />
        <Stat label="粗利率" value={pct(r.margin)} tone={tone} />
        <Stat label="顧客の合計ポイント率" value={pct(r.customerTotalPointRate)} accent />
        <Stat label="顧客が受け取るポイント" value={yen(r.customerPoints)} />
        <Stat label="実質値引き相当（店舗分）" value={pct(r.shopBurdenRate)} />
      </div>

      <button
        onClick={() =>
          recordHistory(
            "rakuten-point-sim",
            r.profit < 0 ? "赤字判定" : `粗利率 ${pct(r.margin)}`,
            `店舗負担${pct(r.shopBurdenRate)} / 顧客還元${pct(r.customerTotalPointRate)}`,
          )
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
