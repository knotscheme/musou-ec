"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

interface Row {
  sku: string;
  cur: number;
  cost: number;
  fba: number;
}

const SAMPLE = `SKU-001, 3480, 1200, 434
SKU-002, 1980, 900, 350
SKU-003, 6980, 2600, 520`;

export default function AmazonRepricingFloor() {
  const [raw, setRaw] = useState(SAMPLE);
  const [refRate, setRefRate] = useState(10); // 販売手数料率%
  const [other, setOther] = useState(120); // その他コスト/個
  const [ret, setRet] = useState(3); // 返品引当%
  const [target, setTarget] = useState(12); // 目標利益率%

  const rows = useMemo<Row[]>(() => {
    return raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const p = l.split(",").map((s) => s.trim());
        return { sku: p[0] ?? "", cur: +p[1] || 0, cost: +p[2] || 0, fba: +p[3] || 0 };
      })
      .filter((r) => r.sku && !/sku/i.test(r.sku));
  }, [raw]);

  const calc = useMemo(() => {
    const kBase = 1 - refRate / 100 - ret / 200;
    return rows.map((r) => {
      const fixed = r.fba + r.cost + other;
      const beFloor = kBase > 0 ? fixed / kBase : 0;
      const tgFloor = kBase - target / 100 > 0 ? fixed / (kBase - target / 100) : Infinity;
      const marginAtCur =
        r.cur > 0 ? (r.cur * kBase - fixed) / r.cur : 0;
      const headroom = r.cur - tgFloor;
      return { ...r, beFloor, tgFloor, marginAtCur, headroom };
    });
  }, [rows, refRate, other, ret, target]);

  function exportCsv() {
    downloadCSV("repricing-floor", [
      ["SKU", "現価格", "損益分岐下限", "目標利益下限", "現価格利益率", "目標下限までの余裕"],
      ...calc.map((c) => [
        c.sku,
        c.cur,
        Math.ceil(c.beFloor),
        Number.isFinite(c.tgFloor) ? Math.ceil(c.tgFloor) : "算出不可",
        `${(c.marginAtCur * 100).toFixed(1)}%`,
        Number.isFinite(c.tgFloor) ? Math.round(c.headroom) : "-",
      ]),
    ]);
    recordHistory("amazon-repricing-floor", `${calc.length}SKUの下限価格`, `目標利益率${target}%`);
  }

  return (
    <ToolShell slug="amazon-repricing-floor">
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="販売手数料率（%）">
          <NumberInput value={refRate} onChange={(e) => setRefRate(+e.target.value)} />
        </Field>
        <Field label="その他コスト（円/個）">
          <NumberInput value={other} onChange={(e) => setOther(+e.target.value)} />
        </Field>
        <Field label="返品引当（%）">
          <NumberInput value={ret} onChange={(e) => setRet(+e.target.value)} />
        </Field>
        <Field label="目標利益率（%）">
          <NumberInput value={target} onChange={(e) => setTarget(+e.target.value)} />
        </Field>
      </div>

      <Field label="SKUデータ（SKU, 現価格, 原価, FBA手数料）" hint="1行1SKU / CSV貼り付け可">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          className="w-full rounded-md border px-3 py-2 font-mono text-sm"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <label className="rounded-md border px-3 py-2 text-sm font-semibold">
          CSV読込
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                f.text().then((t) =>
                  setRaw(
                    parseCSV(t)
                      .filter((r) => r.some((c) => c.trim()))
                      .map((r) => r.slice(0, 4).join(", "))
                      .join("\n"),
                  ),
                );
            }}
          />
        </label>
        <button
          onClick={exportCsv}
          className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
        >
          結果CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-[var(--muted)]">
              <th className="py-2 pr-3">SKU</th>
              <th className="py-2 pr-3">現価格</th>
              <th className="py-2 pr-3">損益分岐下限</th>
              <th className="py-2 pr-3">目標利益下限</th>
              <th className="py-2 pr-3">現価格の利益率</th>
              <th className="py-2 pr-3">判定</th>
            </tr>
          </thead>
          <tbody>
            {calc.map((c) => {
              const bad = c.cur < c.beFloor;
              const warn = !bad && Number.isFinite(c.tgFloor) && c.cur < c.tgFloor;
              return (
                <tr key={c.sku} className="border-b">
                  <td className="py-2 pr-3 font-mono">{c.sku}</td>
                  <td className="py-2 pr-3">{yen(c.cur)}</td>
                  <td className="py-2 pr-3">{yen(Math.ceil(c.beFloor))}</td>
                  <td className="py-2 pr-3">
                    {Number.isFinite(c.tgFloor) ? yen(Math.ceil(c.tgFloor)) : "—"}
                  </td>
                  <td
                    className="py-2 pr-3"
                    style={{ color: c.marginAtCur < 0 ? "#bf0000" : undefined }}
                  >
                    {(c.marginAtCur * 100).toFixed(1)}%
                  </td>
                  <td
                    className="py-2 pr-3 font-semibold"
                    style={{ color: bad ? "#bf0000" : warn ? "#a1701c" : "#1a8a5a" }}
                  >
                    {bad ? "赤字ライン割れ" : warn ? "目標未達" : "OK"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ToolShell>
  );
}
