"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${n.toFixed(0)}`;

/**
 * アイテムリーチ広告（旧アイテムマッチ, 2025/8移行）の入札設計。
 * 商品粗利率を軸に、損益分岐ROAS/ACoS と 1クリックの価値(=上限CPC)、
 * 安全マージンを引いた推奨入札額を出す。
 */
export default function YahooItemreach() {
  const [aov, setAov] = useState(4500); // 客単価（広告経由の平均注文額）
  const [marginRate, setMarginRate] = useState(28); // 商品粗利率(%)（広告費・ポイント除く）
  const [cvr, setCvr] = useState(1.8); // 広告経由CVR(%)
  const [safety, setSafety] = useState(20); // 安全マージン(%)
  const [currentCpc, setCurrentCpc] = useState(40); // 現在の平均CPC（任意）

  const r = useMemo(() => {
    const m = marginRate / 100;
    const c = cvr / 100;
    const beRoas = m > 0 ? 1 / m : 0; // 損益分岐ROAS（倍）
    const beAcos = m; // 損益分岐ACoS
    const clickValue = aov * c * m; // 1クリックの粗利貢献 = 上限CPC
    const recommendedCpc = clickValue * (1 - safety / 100);
    const requiredCvrAtCurrent = aov * m > 0 ? currentCpc / (aov * m) : 0; // 現CPCで黒字化に必要なCVR
    const currentAcos = clickValue > 0 && currentCpc > 0 ? (currentCpc / (aov * c)) : 0; // 現CPCのACoS
    return { beRoas, beAcos, clickValue, recommendedCpc, requiredCvrAtCurrent, currentAcos };
  }, [aov, marginRate, cvr, safety, currentCpc]);

  const cpcTone = currentCpc <= r.recommendedCpc ? "ok" : currentCpc <= r.clickValue ? "warn" : "bad";

  return (
    <ToolShell slug="yahoo-itemreach">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="客単価（広告経由・円）">
          <NumberInput value={aov} onChange={(e) => setAov(+e.target.value)} />
        </Field>
        <Field label="商品粗利率（%）" hint="広告費・ポイント原資を除いた粗利率">
          <NumberInput value={marginRate} onChange={(e) => setMarginRate(+e.target.value)} />
        </Field>
        <Field label="広告経由CVR（%）">
          <NumberInput value={cvr} onChange={(e) => setCvr(+e.target.value)} />
        </Field>
        <Field label="安全マージン（%）" hint="上限CPCから引く余裕幅">
          <NumberInput value={safety} onChange={(e) => setSafety(+e.target.value)} />
        </Field>
        <Field label="現在の平均CPC（円・任意）">
          <NumberInput value={currentCpc} onChange={(e) => setCurrentCpc(+e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="損益分岐ROAS" value={`${(r.beRoas * 100).toFixed(0)}%`} />
        <Stat label="損益分岐ACoS" value={`${(r.beAcos * 100).toFixed(1)}%`} />
        <Stat label="1クリックの価値（上限CPC）" value={yen(r.clickValue)} accent />
        <Stat label="推奨入札CPC" value={yen(r.recommendedCpc)} tone="ok" />
        <Stat label="現CPCの想定ACoS" value={`${(r.currentAcos * 100).toFixed(1)}%`} tone={cpcTone} />
        <Stat
          label="現CPCで黒字に必要なCVR"
          value={`${(r.requiredCvrAtCurrent * 100).toFixed(2)}%`}
          tone={r.requiredCvrAtCurrent <= cvr / 100 ? "ok" : "bad"}
        />
      </div>

      <div className="card p-4 text-sm">
        {currentCpc > r.clickValue ? (
          <p style={{ color: "#bf0000" }}>
            現在のCPC {yen(currentCpc)} は上限 {yen(r.clickValue)} を超過。入札引き下げか、CVR/客単価の改善が必要。
          </p>
        ) : currentCpc > r.recommendedCpc ? (
          <p style={{ color: "#a1701c" }}>
            黒字圏だが余裕は小さい。推奨 {yen(r.recommendedCpc)} まで下げると安全。
          </p>
        ) : (
          <p style={{ color: "#1a8a5a" }}>
            現在のCPCは推奨入札額の範囲内。予算内で入札を強めて露出拡大の余地あり。
          </p>
        )}
      </div>

      <button
        onClick={() =>
          recordHistory(
            "yahoo-itemreach",
            `推奨CPC ${yen(r.recommendedCpc)}`,
            `粗利率${marginRate}% / CVR${cvr}% / 損益分岐ACoS${(r.beAcos * 100).toFixed(1)}%`,
          )
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
