"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { CopyBox } from "@/components/CopyBox";
import { recordHistory } from "@/lib/history";

type Tone = "polite" | "casual" | "brand";

export default function ShopifyAbandonedCart() {
  const [shop, setShop] = useState("MUSOU STORE");
  const [coupon, setCoupon] = useState("CART10");
  const [discount, setDiscount] = useState(10);
  const [tone, setTone] = useState<Tone>("polite");
  const [useCouponFrom, setUseCouponFrom] = useState<2 | 3>(2); // 何通目からクーポンを出すか

  const mails = useMemo(() => {
    const greet =
      tone === "casual" ? "こんにちは！" : tone === "brand" ? "" : "いつもご覧いただきありがとうございます。";
    const sign =
      tone === "casual" ? `— ${shop} より` : `${shop} カスタマーチーム`;
    const c = `クーポンコード「${coupon}」で ${discount}% OFF`;

    const m1 = {
      subject: `【${shop}】カートに商品が残っています`,
      body: [
        `{{first_name}} 様`,
        "",
        greet,
        "ご覧いただいた商品をカートにお預かりしています。在庫には限りがございますので、お早めにご確認ください。",
        "",
        "▼ カートの中身を確認する",
        "{{checkout_url}}",
        "",
        "・{{product}}",
        "",
        sign,
      ]
        .filter((l) => l !== null)
        .join("\n"),
    };
    const m2 = {
      subject:
        useCouponFrom <= 2
          ? `【${shop}】${discount}%OFFクーポンをご用意しました`
          : `【${shop}】カートの商品はまだ間に合います`,
      body: [
        `{{first_name}} 様`,
        "",
        "先日カートに入れていただいた商品について、ご不明な点はございませんか？サイズ・在庫・お届け日など、お気軽にご返信ください。",
        useCouponFrom <= 2 ? `\n本日中のご注文で ${c}。\n` : "",
        "▼ 購入手続きへ",
        "{{checkout_url}}",
        "",
        sign,
      ]
        .filter(Boolean)
        .join("\n"),
    };
    const m3 = {
      subject: `【${shop}】まもなくカートが期限切れになります`,
      body: [
        `{{first_name}} 様`,
        "",
        "カートの保持期限が近づいています。ご購入をご検討中でしたら、このメールからそのままお進みいただけます。",
        `\n${c}（本メール限定・有効期限あり）\n`,
        "▼ いますぐ購入",
        "{{checkout_url}}",
        "",
        "今回はタイミングが合わなかった場合も、また候補に入れていただけたら嬉しいです。",
        "",
        sign,
      ].join("\n"),
    };
    return [
      { when: "1時間後", ...m1 },
      { when: "24時間後", ...m2 },
      { when: "72時間後", ...m3 },
    ];
  }, [shop, coupon, discount, tone, useCouponFrom]);

  return (
    <ToolShell slug="shopify-abandoned-cart">
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="ショップ名">
          <TextInput value={shop} onChange={(e) => setShop(e.target.value)} />
        </Field>
        <Field label="クーポンコード">
          <TextInput value={coupon} onChange={(e) => setCoupon(e.target.value)} />
        </Field>
        <Field label="割引率（%）">
          <TextInput
            type="number"
            value={discount}
            onChange={(e) => setDiscount(+e.target.value)}
          />
        </Field>
        <Field label="クーポンを出す通">
          <select
            value={useCouponFrom}
            onChange={(e) => setUseCouponFrom(+e.target.value as 2 | 3)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value={2}>2通目から</option>
            <option value={3}>3通目のみ</option>
          </select>
        </Field>
      </div>
      <div className="flex gap-4 text-sm">
        {(["polite", "casual", "brand"] as Tone[]).map((tv) => (
          <label key={tv} className="flex items-center gap-1">
            <input type="radio" checked={tone === tv} onChange={() => setTone(tv)} />
            {tv === "polite" ? "丁寧" : tv === "casual" ? "カジュアル" : "ブランド"}
          </label>
        ))}
      </div>

      <p className="text-xs text-[var(--muted)]">
        差し込みタグ：<code>{"{{first_name}}"}</code> <code>{"{{product}}"}</code>{" "}
        <code>{"{{checkout_url}}"}</code>（Shopify のカゴ落ちフロー / メールに貼り付け）
      </p>

      <div className="space-y-3">
        {mails.map((m, i) => (
          <CopyBox
            key={i}
            title={`${i + 1}通目（${m.when}）｜件名: ${m.subject}`}
            text={`件名: ${m.subject}\n\n${m.body}`}
            rows={i === 2 ? 12 : 10}
          />
        ))}
      </div>

      <button
        onClick={() => recordHistory("shopify-abandoned-cart", "カゴ落ちメール3通生成", `${shop} / ${discount}%OFF`)}
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
