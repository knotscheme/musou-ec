"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** Yahoo!ショッピングのストアクーポン＋PayPay/LYP店舗負担分＋セール値引きの原資と粗利。 */
export default function YahooCouponSim() {
  const [price, setPrice] = useState(4980);
  const [cost, setCost] = useState(1900);
  const [otherCost, setOtherCost] = useState(450);
  const [feeRate, setFeeRate] = useState(9); // Yahoo 実効手数料率（ストアポイント原資・キャンペーン原資・アフィリ等の固定分）
  const [saleOff, setSaleOff] = useState(0);
  const [couponYen, setCouponYen] = useState(500); // ストアクーポン（店舗負担）
  const [storePointRate, setStorePointRate] = useState(4); // 倍！キャンペーン等の店舗負担ポイント原資率(%)
  const [targetMargin, setTargetMargin] = useState(15);

  const r = useMemo(() => {
    const sell = Math.max(0, price - saleOff);
    const fee = sell * (feeRate / 100);
    const coupon = Math.min(couponYen, sell);
    const point = sell * (storePointRate / 100);
    const net = sell - fee - coupon - point;
    const profit = net - cost - otherCost;
    const margin = sell > 0 ? profit / sell : 0;
    const discountRate = price > 0 ? (saleOff + coupon + point) / price : 0;
    const headroomTarget = profit - sell * (targetMargin / 100);
    return { sell, fee, coupon, point, net, profit, margin, discountRate, headroomTarget };
  }, [price, cost, otherCost, feeRate, saleOff, couponYen, storePointRate, targetMargin]);

  const tone = r.profit < 0 ? "bad" : r.headroomTarget < 0 ? "warn" : "ok";

  return (
    <ToolShell slug="yahoo-coupon-sim">
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
        <Field label="Yahoo実効手数料率（%）" hint="ストアポイント原資・キャンペーン原資・アフィリ等の固定負担">
          <NumberInput value={feeRate} onChange={(e) => setFeeRate(+e.target.value)} />
        </Field>
        <Field label="目標粗利率（%）">
          <NumberInput value={targetMargin} onChange={(e) => setTargetMargin(+e.target.value)} />
        </Field>
      </div>

      <div className="card p-4">
        <p className="mb-3 text-sm font-semibold">値引き施策（併用）</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="セール値引き（円）">
            <NumberInput value={saleOff} onChange={(e) => setSaleOff(+e.target.value)} />
          </Field>
          <Field label="ストアクーポン（店舗負担・円）">
            <NumberInput value={couponYen} onChange={(e) => setCouponYen(+e.target.value)} />
          </Field>
          <Field label="倍！等 店舗負担ポイント原資率（%）">
            <NumberInput
              value={storePointRate}
              onChange={(e) => setStorePointRate(+e.target.value)}
            />
          </Field>
        </div>
      </div>

      {r.profit < 0 && (
        <div className="rounded-lg border-2 p-3 text-sm font-semibold" style={{ borderColor: "#bf0000", color: "#bf0000" }}>
          ⚠ この組み合わせは赤字です（粗利 {yen(r.profit)}）。
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="実売価格" value={yen(r.sell)} />
        <Stat label="Yahoo手数料" value={`- ${yen(r.fee)}`} />
        <Stat label="クーポン負担" value={`- ${yen(r.coupon)}`} />
        <Stat label="ポイント原資" value={`- ${yen(r.point)}`} />
        <Stat label="店舗手取り" value={yen(r.net)} />
        <Stat label="粗利" value={yen(r.profit)} tone={tone} />
        <Stat label="粗利率" value={pct(r.margin)} tone={tone} />
        <Stat label="値引き総額比" value={pct(r.discountRate)} />
        <Stat
          label={`目標粗利率${targetMargin}%まで`}
          value={r.headroomTarget < 0 ? `${yen(-r.headroomTarget)} 圧縮必要` : `+${yen(r.headroomTarget)} 余力`}
          tone={r.headroomTarget < 0 ? "bad" : "ok"}
        />
      </div>

      <button
        onClick={() =>
          recordHistory(
            "yahoo-coupon-sim",
            r.profit < 0 ? "赤字判定" : `粗利率 ${pct(r.margin)}`,
            `実売${yen(r.sell)} / 値引き計${pct(r.discountRate)}`,
          )
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
