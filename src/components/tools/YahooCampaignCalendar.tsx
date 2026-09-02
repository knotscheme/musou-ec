"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { downloadCSV } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

interface Ev {
  date: string;
  weekday: string;
  type: string;
}

const WD = ["日", "月", "火", "水", "木", "金", "土"];

function buildEvents(from: Date, months: number): Ev[] {
  const evs: Ev[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  for (let m = 0; m < months; m++) {
    const y = cur.getFullYear();
    const mo = cur.getMonth();
    const days = new Date(y, mo + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, mo, d);
      const iso = `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const wd = WD[dt.getDay()];
      const types: string[] = [];
      if (d === 5 || d === 15 || d === 25) types.push("5のつく日");
      if (d === 11 || d === 22) types.push("ゾロ目の日");
      if (d === 1) types.push("月初セール");
      if (dt.getDay() === 0) types.push("日曜（PayPay強化）");
      for (const t of types) evs.push({ date: iso, weekday: wd, type: t });
    }
    cur.setMonth(cur.getMonth() + 1);
  }
  return evs;
}

export default function YahooCampaignCalendar() {
  const today = new Date();
  const [start, setStart] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [months, setMonths] = useState(3);
  const [gmvPerEvent, setGmvPerEvent] = useState(300000);
  const [couponRate, setCouponRate] = useState(5);
  const [pointRate, setPointRate] = useState(4);
  const [marginRate, setMarginRate] = useState(28);

  const events = useMemo(() => {
    const [y, m] = start.split("-").map(Number);
    if (!y || !m) return [];
    return buildEvents(new Date(y, m - 1, 1), months);
  }, [start, months]);

  const perEvent = useMemo(() => {
    const genzai = gmvPerEvent * (couponRate + pointRate) / 100;
    const grossBefore = gmvPerEvent * (marginRate / 100);
    const grossAfter = grossBefore - genzai;
    return { genzai, grossBefore, grossAfter };
  }, [gmvPerEvent, couponRate, pointRate, marginRate]);

  const totals = useMemo(() => {
    const n = events.length;
    return {
      count: n,
      gmv: n * gmvPerEvent,
      genzai: n * perEvent.genzai,
      gross: n * perEvent.grossAfter,
    };
  }, [events, gmvPerEvent, perEvent]);

  function exportCsv() {
    downloadCSV("yahoo-campaign-plan", [
      ["日付", "曜日", "施策", "想定GMV", "クーポン+ポイント原資", "施策後粗利"],
      ...events.map((e) => [e.date, e.weekday, e.type, gmvPerEvent, Math.round(perEvent.genzai), Math.round(perEvent.grossAfter)]),
    ]);
    recordHistory("yahoo-campaign-calendar", `${events.length}イベントの原資プラン`, `原資計 ${yen(totals.genzai)}`);
  }

  return (
    <ToolShell slug="yahoo-campaign-calendar">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="開始月">
          <input type="month" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
        </Field>
        <Field label="期間（ヶ月）">
          <NumberInput value={months} onChange={(e) => setMonths(Math.min(12, Math.max(1, +e.target.value)))} />
        </Field>
        <Field label="1イベントの想定GMV（円）">
          <NumberInput value={gmvPerEvent} onChange={(e) => setGmvPerEvent(+e.target.value)} />
        </Field>
        <Field label="クーポン原資率（%）">
          <NumberInput value={couponRate} onChange={(e) => setCouponRate(+e.target.value)} />
        </Field>
        <Field label="ポイント原資率（%）">
          <NumberInput value={pointRate} onChange={(e) => setPointRate(+e.target.value)} />
        </Field>
        <Field label="商品粗利率（%）">
          <NumberInput value={marginRate} onChange={(e) => setMarginRate(+e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="イベント数" value={`${totals.count}`} />
        <Stat label="想定GMV合計" value={yen(totals.gmv)} />
        <Stat label="原資合計" value={yen(totals.genzai)} tone="warn" />
        <Stat label="施策後 粗利合計" value={yen(totals.gross)} tone={totals.gross < 0 ? "bad" : "ok"} />
      </div>

      <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
        カレンダーCSV
      </button>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-[var(--muted)]">
              <th className="py-2 pr-3">日付</th>
              <th className="py-2 pr-3">曜日</th>
              <th className="py-2 pr-3">施策</th>
              <th className="py-2 pr-3">原資/回</th>
              <th className="py-2 pr-3">施策後粗利/回</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i} className="border-b">
                <td className="py-2 pr-3">{e.date}</td>
                <td className="py-2 pr-3">{e.weekday}</td>
                <td className="py-2 pr-3 font-medium">{e.type}</td>
                <td className="py-2 pr-3">{yen(perEvent.genzai)}</td>
                <td className="py-2 pr-3" style={{ color: perEvent.grossAfter < 0 ? "#bf0000" : undefined }}>
                  {yen(perEvent.grossAfter)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--muted)]">
        ※ 施策日は「5のつく日／ゾロ目の日／日曜／月初」を機械的に生成した目安です。実際のキャンペーン日程は
        Yahoo!ショッピングの告知で確認してください。
      </p>
    </ToolShell>
  );
}
