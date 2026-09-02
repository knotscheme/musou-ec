"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function CouponGuard() {
  const [price, setPrice] = useState(4980);
  const [cost, setCost] = useState(1800);
  const [otherCost, setOtherCost] = useState(400); // 送料・梱包など
  const [feeRate, setFeeRate] = useState(10); // モール手数料 %
  const [targetMargin, setTargetMargin] = useState(15); // 目標粗利率 %

  const [saleOff, setSaleOff] = useState(500); // セール値引き（円）
  const [couponYen, setCouponYen] = useState(500); // クーポン（店舗負担・円）
  const [pointRate, setPointRate] = useState(5); // ポイント/還元 原資率（実売価格に対する%）

  const r = useMemo(() => {
    const sell = Math.max(0, price - saleOff);
    const fee = sell * (feeRate / 100);
    const coupon = Math.min(couponYen, sell);
    const point = sell * (pointRate / 100);
    const net = sell - fee - coupon - point; // 店舗手取り
    const profit = net - cost - otherCost;
    const margin = sell > 0 ? profit / sell : 0;

    // 追加であと何円の値引き（クーポン増額）まで粗利0か / 目標粗利率か
    // profit(x) = (sell) - fee - (coupon+x) - point - cost - otherCost
    const headroomBreakeven = profit; // これ以上クーポンを積むと赤字
    const targetProfit = sell * (targetMargin / 100);
    const headroomTarget = profit - targetProfit;

    const totalDiscountRate = price > 0 ? (saleOff + coupon + point) / price : 0;

    return { sell, fee, coupon, point, net, profit, margin, headroomBreakeven, headroomTarget, totalDiscountRate };
  }, [price, cost, otherCost, feeRate, targetMargin, saleOff, couponYen, pointRate]);

  const tone = r.profit < 0 ? "bad" : r.headroomTarget < 0 ? "warn" : "ok";

  function save() {
    recordHistory(
      "coupon-guard",
      r.profit < 0 ? "赤字判定" : `粗利 ${yen(r.profit)}`,
      `実売${yen(r.sell)} / 値引き計${pct(r.totalDiscountRate)} / 粗利率${pct(r.margin)}`,
    );
  }

  return (
    <ToolShell slug="coupon-guard">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="販売価格（税込・円）">
          <NumberInput value={price} onChange={(e) => setPrice(+e.target.value)} />
        </Field>
        <Field label="商品原価（円）">
          <NumberInput value={cost} onChange={(e) => setCost(+e.target.value)} />
        </Field>
        <Field label="その他コスト（送料・梱包等・円）">
          <NumberInput value={otherCost} onChange={(e) => setOtherCost(+e.target.value)} />
        </Field>
        <Field label="モール手数料率（%）" hint="楽天/Yahoo/Amazonの実効率">
          <NumberInput value={feeRate} onChange={(e) => setFeeRate(+e.target.value)} />
        </Field>
        <Field label="目標粗利率（%）">
          <NumberInput value={targetMargin} onChange={(e) => setTargetMargin(+e.target.value)} />
        </Field>
      </div>

      <div className="card p-4">
        <p className="mb-3 text-sm font-semibold">値引き施策（併用）</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="セール値引き（円）" hint="価格自体を下げる＝手数料も減る">
            <NumberInput value={saleOff} onChange={(e) => setSaleOff(+e.target.value)} />
          </Field>
          <Field label="クーポン（店舗負担・円）">
            <NumberInput value={couponYen} onChange={(e) => setCouponYen(+e.target.value)} />
          </Field>
          <Field label="ポイント/還元 原資率（%）" hint="実売価格に対する店舗負担分">
            <NumberInput value={pointRate} onChange={(e) => setPointRate(+e.target.value)} />
          </Field>
        </div>
      </div>

      {r.profit < 0 && (
        <div className="rounded-lg border-2 p-3 text-sm font-semibold" style={{ borderColor: "#bf0000", color: "#bf0000" }}>
          ⚠ この組み合わせは赤字です（粗利 {yen(r.profit)}）。値引きを {yen(-r.headroomBreakeven)} 以上圧縮してください。
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="実売価格" value={yen(r.sell)} />
        <Stat label="モール手数料" value={`- ${yen(r.fee)}`} />
        <Stat label="クーポン負担" value={`- ${yen(r.coupon)}`} />
        <Stat label="ポイント原資" value={`- ${yen(r.point)}`} />
        <Stat label="店舗手取り" value={yen(r.net)} />
        <Stat label="粗利" value={yen(r.profit)} tone={tone} />
        <Stat label="粗利率" value={pct(r.margin)} tone={tone} />
        <Stat label="値引き総額比" value={pct(r.totalDiscountRate)} />
        <Stat
          label="赤字まで余力"
          value={yen(Math.max(0, r.headroomBreakeven))}
          tone={r.headroomBreakeven <= 0 ? "bad" : "ok"}
        />
      </div>

      <div className="card p-4 text-sm">
        <p>
          目標粗利率 {targetMargin}% を満たすには、あと{" "}
          <b style={{ color: r.headroomTarget < 0 ? "#bf0000" : "#1a8a5a" }}>
            {r.headroomTarget < 0 ? `${yen(-r.headroomTarget)} の値引き圧縮が必要` : `${yen(r.headroomTarget)} まで追加値引き可能`}
          </b>
          。
        </p>
      </div>

      <button onClick={save} className="rounded-md border px-4 py-2 text-sm font-semibold">
        この試算を履歴に保存
      </button>
    </ToolShell>
  );
}
