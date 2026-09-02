"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

const SAMPLE = `item-001, 5980, 2200
item-002, 3480, 1500
item-003, 12800, 6000`;

type Mode = "rate" | "amount";
type Round = "round" | "ceil" | "floor";

export default function RakutenSalePrice() {
  const [raw, setRaw] = useState(SAMPLE);
  const [mode, setMode] = useState<Mode>("rate");
  const [rate, setRate] = useState(20);
  const [amount, setAmount] = useState(500);
  const [round, setRound] = useState<Round>("floor");
  const [unit, setUnit] = useState(10);
  const [pointBurden, setPointBurden] = useState(0); // 店舗負担ポイント原資%
  const [feeRate, setFeeRate] = useState(12);

  const rows = useMemo(() => {
    return raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split(",").map((s) => s.trim()))
      .filter((p) => p[0] && !/価格|番号/.test(p[0]))
      .map((p) => ({ id: p[0], normal: +p[1] || 0, cost: p[2] !== undefined ? +p[2] || 0 : null }));
  }, [raw]);

  const calc = useMemo(() => {
    return rows.map((r) => {
      let sale = mode === "rate" ? r.normal * (1 - rate / 100) : r.normal - amount;
      const u = Math.max(1, unit);
      sale = round === "ceil" ? Math.ceil(sale / u) * u : round === "floor" ? Math.floor(sale / u) * u : Math.round(sale / u) * u;
      sale = Math.max(0, sale);
      const off = r.normal - sale;
      const offRate = r.normal > 0 ? off / r.normal : 0;
      let profit: number | null = null;
      let margin: number | null = null;
      if (r.cost != null) {
        profit = sale - sale * (feeRate / 100) - sale * (pointBurden / 100) - r.cost;
        margin = sale > 0 ? profit / sale : 0;
      }
      return { ...r, sale, off, offRate, profit, margin };
    });
  }, [rows, mode, rate, amount, round, unit, pointBurden, feeRate]);

  const lossCount = calc.filter((c) => c.profit != null && c.profit < 0).length;

  function exportCsv() {
    downloadCSV("rakuten-sale-price", [
      ["商品管理番号", "通常価格", "販売価格", "表示価格(二重価格)", "値引き額", "値引き率"],
      ...calc.map((c) => [c.id, c.normal, c.sale, c.normal, c.off, `${(c.offRate * 100).toFixed(0)}%`]),
    ]);
    recordHistory("rakuten-sale-price", `${calc.length}商品のセール価格`, `${mode === "rate" ? `${rate}%OFF` : `${amount}円引`} / 赤字${lossCount}件`);
  }

  return (
    <ToolShell slug="rakuten-sale-price">
      <Field label="商品データ（商品管理番号, 通常価格, 原価※任意）" hint="1行1商品 / CSV貼り付け可。原価を入れると粗利チェック">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          className="w-full rounded-md border px-3 py-2 font-mono text-sm"
        />
      </Field>
      <label className="inline-flex rounded-md border px-3 py-2 text-sm font-semibold">
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
                    .map((r) => r.slice(0, 3).join(", "))
                    .join("\n"),
                ),
              );
          }}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="値引き方式">
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="rate">割引率（%）</option>
            <option value="amount">円引き</option>
          </select>
        </Field>
        {mode === "rate" ? (
          <Field label="割引率（%）"><NumberInput value={rate} onChange={(e) => setRate(+e.target.value)} /></Field>
        ) : (
          <Field label="円引き"><NumberInput value={amount} onChange={(e) => setAmount(+e.target.value)} /></Field>
        )}
        <div className="flex items-end gap-2">
          <Field label="丸め">
            <select value={round} onChange={(e) => setRound(e.target.value as Round)} className="rounded-md border px-3 py-2 text-sm">
              <option value="floor">切り捨て</option>
              <option value="round">四捨五入</option>
              <option value="ceil">切り上げ</option>
            </select>
          </Field>
          <Field label="単位">
            <NumberInput value={unit} onChange={(e) => setUnit(+e.target.value)} className="w-20" />
          </Field>
        </div>
        <Field label="店舗負担ポイント原資（%）"><NumberInput value={pointBurden} onChange={(e) => setPointBurden(+e.target.value)} /></Field>
        <Field label="楽天手数料率（%）"><NumberInput value={feeRate} onChange={(e) => setFeeRate(+e.target.value)} /></Field>
      </div>

      {lossCount > 0 && (
        <div className="rounded-lg border-2 p-3 text-sm font-semibold" style={{ borderColor: "#bf0000", color: "#bf0000" }}>
          ⚠ {lossCount} 商品が赤字（手数料・ポイント原資込み）。
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
          セール価格CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-[var(--muted)]">
              <th className="py-2 pr-3">番号</th>
              <th className="py-2 pr-3">通常</th>
              <th className="py-2 pr-3">セール</th>
              <th className="py-2 pr-3">値引き</th>
              <th className="py-2 pr-3">粗利</th>
              <th className="py-2 pr-3">粗利率</th>
            </tr>
          </thead>
          <tbody>
            {calc.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2 pr-3 font-mono">{c.id}</td>
                <td className="py-2 pr-3">{yen(c.normal)}</td>
                <td className="py-2 pr-3 font-semibold">{yen(c.sale)}</td>
                <td className="py-2 pr-3">
                  {yen(c.off)}（{(c.offRate * 100).toFixed(0)}%）
                </td>
                <td className="py-2 pr-3" style={{ color: c.profit != null && c.profit < 0 ? "#bf0000" : undefined }}>
                  {c.profit != null ? yen(c.profit) : "—"}
                </td>
                <td className="py-2 pr-3" style={{ color: c.margin != null && c.margin < 0 ? "#bf0000" : c.margin != null && c.margin < 0.1 ? "#a1701c" : undefined }}>
                  {c.margin != null ? `${(c.margin * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--muted)]">
        ※ 出力CSVの列は「二重価格＝通常価格」を参考表示にした汎用形式です。RMSの実カラム名は
        店舗のフォーマットに合わせて調整してください。二重価格は最近相当期間の販売実績が必要（景表法）。
      </p>
    </ToolShell>
  );
}
