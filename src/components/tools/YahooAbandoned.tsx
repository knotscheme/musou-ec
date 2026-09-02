"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, TextInput, Stat } from "@/components/ToolShell";
import { CopyBox } from "@/components/CopyBox";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

/** Yahoo!ショッピングのカート・お気に入り落ち向けクーポン設計＋訴求文。 */
export default function YahooAbandoned() {
  const [product, setProduct] = useState("○○（商品名）");
  const [price, setPrice] = useState(4980);
  const [cost, setCost] = useState(1900);
  const [feeRate, setFeeRate] = useState(9);

  const rows = useMemo(() => {
    return [5, 8, 10, 15].map((off) => {
      const discounted = price * (1 - off / 100);
      const profit = discounted - discounted * (feeRate / 100) - cost;
      return { off, discounted, profit, margin: discounted > 0 ? profit / discounted : 0 };
    });
  }, [price, cost, feeRate]);

  const copy = (off: number) =>
    [
      `【${product}】お気に入り登録ありがとうございます`,
      "",
      `ご覧いただいた「${product}」に、${off}%OFFクーポンをご用意しました。`,
      "在庫に限りがあります。カートからそのままご購入いただけます。",
      "",
      "▼ クーポンを使う",
      "（ストアクーポンのURLを貼り付け）",
      "",
      "※ クーポンには有効期限があります。",
    ].join("\n");

  return (
    <ToolShell slug="yahoo-abandoned">
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="商品名">
          <TextInput value={product} onChange={(e) => setProduct(e.target.value)} />
        </Field>
        <Field label="販売価格（円）">
          <NumberInput value={price} onChange={(e) => setPrice(+e.target.value)} />
        </Field>
        <Field label="原価（円）">
          <NumberInput value={cost} onChange={(e) => setCost(+e.target.value)} />
        </Field>
        <Field label="手数料率（%）">
          <NumberInput value={feeRate} onChange={(e) => setFeeRate(+e.target.value)} />
        </Field>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-[var(--muted)]">
              <th className="py-2 pr-3">クーポン</th>
              <th className="py-2 pr-3">適用後価格</th>
              <th className="py-2 pr-3">粗利</th>
              <th className="py-2 pr-3">粗利率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.off} className="border-b">
                <td className="py-2 pr-3 font-semibold">{r.off}% OFF</td>
                <td className="py-2 pr-3">{yen(r.discounted)}</td>
                <td className="py-2 pr-3" style={{ color: r.profit < 0 ? "#bf0000" : undefined }}>
                  {yen(r.profit)}
                </td>
                <td className="py-2 pr-3" style={{ color: r.margin < 0 ? "#bf0000" : r.margin < 0.1 ? "#a1701c" : "#1a8a5a" }}>
                  {(r.margin * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="推奨クーポン" value={`${(rows.find((r) => r.margin >= 0.1)?.off ?? rows[0].off)}% OFF`} accent />
      </div>

      <div className="space-y-3">
        <CopyBox title="訴求文（お気に入り登録者向け・軽め）" text={copy(rows.find((r) => r.margin >= 0.12)?.off ?? 5)} rows={9} />
        <CopyBox title="訴求文（カート落ち・強め）" text={copy(rows.find((r) => r.margin >= 0.05)?.off ?? 10)} rows={9} />
      </div>

      <button
        onClick={() => recordHistory("yahoo-abandoned", "クーポン設計＋訴求文", `${product} / ${price}円`)}
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
