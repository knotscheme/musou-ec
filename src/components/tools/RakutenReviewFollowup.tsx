"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { CopyBox } from "@/components/CopyBox";
import { recordHistory } from "@/lib/history";

type Purpose = "thanks" | "review" | "kaimawari" | "repeat";
type Timing = "ship" | "arrive3" | "week2";

const PURPOSE_LABEL: Record<Purpose, string> = {
  thanks: "サンクス",
  review: "レビュー依頼",
  kaimawari: "買い回り訴求",
  repeat: "リピート促進",
};
const TIMING_LABEL: Record<Timing, string> = {
  ship: "発送時",
  arrive3: "到着後3日",
  week2: "2週間後",
};

export default function RakutenReviewFollowup() {
  const [shop, setShop] = useState("○○ショップ");
  const [product, setProduct] = useState("{商品名}");
  const [purpose, setPurpose] = useState<Purpose>("review");
  const [timing, setTiming] = useState<Timing>("arrive3");
  const [incentive, setIncentive] = useState("レビュー投稿で使える100円OFFクーポン");

  const mail = useMemo(() => {
    const head = `{お客様名} 様\n\nこのたびは ${shop} で「${product}」をご購入いただき、誠にありがとうございます。\n（ご注文番号：{注文番号}）`;
    const foot = `\n\n────────────\n${shop}\n※本メールは ${TIMING_LABEL[timing]} に自動送信しています。`;

    let subject = "";
    let body = "";
    if (purpose === "thanks") {
      subject = `【${shop}】ご購入ありがとうございます`;
      body = `${head}\n\n商品はいかがでしたでしょうか。ご不明な点や不具合がございましたら、このメールへご返信ください。迅速に対応いたします。${foot}`;
    } else if (purpose === "review") {
      subject = `【${shop}】「${product}」のご感想を聞かせてください`;
      body = `${head}\n\nもしよろしければ、商品ページのレビュー投稿でご感想をお聞かせいただけないでしょうか。今後の品揃え・サービス改善の参考にさせていただきます。${
        incentive ? `\n\n【特典】${incentive}` : ""
      }\n\n▼ レビューを書く\n（楽天の商品ページ / 注文履歴からのレビューURLを記載）${foot}`;
    } else if (purpose === "kaimawari") {
      subject = `【${shop}】お買い物マラソンでまとめ買いがお得です`;
      body = `${head}\n\n現在、楽天では「お買い物マラソン」を開催中です。複数ショップでのお買い回りでポイントアップの対象になります。\n当店の他の商品もぜひご覧ください。\n\n▼ ${shop} の商品一覧\n（ショップTOP / おすすめ特集のURL）${foot}`;
    } else {
      subject = `【${shop}】そろそろ買い替え・補充の時期です`;
      body = `${head}\n\nお使いの「${product}」はそろそろ使い切りのタイミングではないでしょうか。\nリピートのお客様向けに、まとめ買い・定期のご案内もございます。${
        incentive ? `\n\n【特典】${incentive}` : ""
      }\n\n▼ 再購入はこちら\n（商品ページURL）${foot}`;
    }
    return { subject, body };
  }, [shop, product, purpose, timing, incentive]);

  return (
    <ToolShell slug="rakuten-review-followup">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="店舗名">
          <TextInput value={shop} onChange={(e) => setShop(e.target.value)} />
        </Field>
        <Field label="商品名（差し込み可）">
          <TextInput value={product} onChange={(e) => setProduct(e.target.value)} />
        </Field>
        <Field label="目的">
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as Purpose)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="送信タイミング">
          <select
            value={timing}
            onChange={(e) => setTiming(e.target.value as Timing)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {Object.entries(TIMING_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="特典（任意）">
          <TextInput value={incentive} onChange={(e) => setIncentive(e.target.value)} />
        </Field>
      </div>

      <p className="text-xs text-[var(--muted)]">
        差し込みタグ：<code>{"{お客様名}"}</code> <code>{"{注文番号}"}</code>{" "}
        <code>{"{商品名}"}</code>（RMS のサンクスメール／メルマガ機能に貼り付け）。
        レビュー特典は楽天のガイドライン（金銭的対価の表現・強制表現の禁止等）に沿って運用してください。
      </p>

      <CopyBox title={`件名: ${mail.subject}`} text={`件名: ${mail.subject}\n\n${mail.body}`} rows={16} />

      <button
        onClick={() =>
          recordHistory("rakuten-review-followup", `${PURPOSE_LABEL[purpose]}メール`, `${TIMING_LABEL[timing]}送信 / ${shop}`)
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
