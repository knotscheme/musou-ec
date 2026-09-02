"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

export default function AmazonRestock() {
  const [sold30, setSold30] = useState(120); // 直近30日の販売数
  const [leadTime, setLeadTime] = useState(21); // 発注〜FBA受領（日）
  const [cycle, setCycle] = useState(30); // 発注サイクル（日）
  const [safetyDays, setSafetyDays] = useState(10); // 安全在庫（日数）
  const [onHand, setOnHand] = useState(60); // 現在のFBA在庫
  const [inbound, setInbound] = useState(0); // 入荷待ち

  const r = useMemo(() => {
    const daily = sold30 / 30;
    const rop = daily * (leadTime + safetyDays); // 発注点
    const orderQty = Math.max(
      0,
      daily * (cycle + leadTime + safetyDays) - onHand - inbound,
    );
    const coverDays = daily > 0 ? (onHand + inbound) / daily : Infinity;
    const stockoutInDays = daily > 0 ? onHand / daily : Infinity;
    const needOrderNow = onHand + inbound <= rop;
    const eta = Number.isFinite(stockoutInDays) ? `約 ${Math.ceil(stockoutInDays)} 日後` : "—";
    return { daily, rop, orderQty, coverDays, stockoutInDays, needOrderNow, eta };
  }, [sold30, leadTime, cycle, safetyDays, onHand, inbound]);

  const eta = r.eta;

  return (
    <ToolShell slug="amazon-restock">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="直近30日の販売数">
          <NumberInput value={sold30} onChange={(e) => setSold30(+e.target.value)} />
        </Field>
        <Field label="リードタイム（日）" hint="発注〜FBA受領">
          <NumberInput value={leadTime} onChange={(e) => setLeadTime(+e.target.value)} />
        </Field>
        <Field label="発注サイクル（日）" hint="何日ごとに発注するか">
          <NumberInput value={cycle} onChange={(e) => setCycle(+e.target.value)} />
        </Field>
        <Field label="安全在庫（日数）">
          <NumberInput value={safetyDays} onChange={(e) => setSafetyDays(+e.target.value)} />
        </Field>
        <Field label="現在のFBA在庫">
          <NumberInput value={onHand} onChange={(e) => setOnHand(+e.target.value)} />
        </Field>
        <Field label="入荷待ち数">
          <NumberInput value={inbound} onChange={(e) => setInbound(+e.target.value)} />
        </Field>
      </div>

      {r.needOrderNow && (
        <div className="rounded-lg border-2 p-3 text-sm font-semibold" style={{ borderColor: "#bf0000", color: "#bf0000" }}>
          ⚠ 在庫（{onHand + inbound}）が発注点（{Math.ceil(r.rop)}）を下回っています。今すぐ発注してください。
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="日販（平均）" value={`${r.daily.toFixed(1)} 個/日`} />
        <Stat label="発注点（ROP）" value={`${Math.ceil(r.rop)} 個`} accent />
        <Stat label="推奨発注量" value={`${Math.ceil(r.orderQty)} 個`} accent />
        <Stat
          label="在庫カバー日数"
          value={Number.isFinite(r.coverDays) ? `${r.coverDays.toFixed(0)} 日` : "—"}
        />
        <Stat
          label="欠品まで"
          value={eta}
          tone={r.stockoutInDays < leadTime ? "bad" : r.stockoutInDays < leadTime + safetyDays ? "warn" : "ok"}
        />
        <Stat label="発注要否" value={r.needOrderNow ? "今すぐ発注" : "在庫OK"} tone={r.needOrderNow ? "bad" : "ok"} />
      </div>

      <button
        onClick={() =>
          recordHistory(
            "amazon-restock",
            r.needOrderNow ? `発注 ${Math.ceil(r.orderQty)}個` : "在庫OK",
            `日販${r.daily.toFixed(1)} / ROP${Math.ceil(r.rop)} / カバー${r.coverDays.toFixed(0)}日`,
          )
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
