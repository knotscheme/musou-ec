"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { CopyBox } from "@/components/CopyBox";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { recordHistory } from "@/lib/history";

type Stage = "ship" | "arrive" | "review" | "repeat";
const STAGE_LABEL: Record<Stage, string> = {
  ship: "発送時",
  arrive: "到着1〜2日後（フォロー）",
  review: "到着1週間後（レビュー依頼）",
  repeat: "3〜4週間後（リピート促進）",
};

function template(stage: Stage, shop: string, incentive: string): { subject: string; body: string } {
  const head = "{name} 様";
  const foot = `\n\n──────────\n${shop}`;
  switch (stage) {
    case "ship":
      return {
        subject: `【${shop}】商品を発送しました（ご注文 {order}）`,
        body: `${head}\n\nこのたびはご注文ありがとうございます。「{product}」を本日発送いたしました。\nお届けまで今しばらくお待ちください。\n\n到着後、商品に不具合や不明点がありましたら、このメールにご返信ください。${foot}`,
      };
    case "arrive":
      return {
        subject: `【${shop}】「{product}」は届きましたか？`,
        body: `${head}\n\n先日ご注文の「{product}」はお手元に届きましたでしょうか。\n使い方でご不明な点や、初期不良などございませんか。気になる点があれば遠慮なくご返信ください。\n\n快適にお使いいただけるよう、サポートいたします。${foot}`,
      };
    case "review":
      return {
        subject: `【${shop}】ご感想を聞かせていただけませんか`,
        body: `${head}\n\n「{product}」をお使いになって1週間ほど経ちました。使い心地はいかがでしょうか。\n\nもしよろしければ、商品ページのレビューでご感想をお聞かせください。今後の改善の参考にさせていただきます。${
          incentive ? `\n\n【ささやかなお礼】${incentive}` : ""
        }${foot}`,
      };
    case "repeat":
      return {
        subject: `【${shop}】そろそろ補充のタイミングです`,
        body: `${head}\n\n「{product}」をご購入いただいてから約1か月。そろそろ使い切りのころではないでしょうか。\n\nリピートのお客様向けに、まとめ買い・定期のご案内もございます。${
          incentive ? `\n${incentive}` : ""
        }\n\n▼ 再購入はこちら\n（商品ページURL）${foot}`,
      };
  }
}

export default function FollowupMessage() {
  const [shop, setShop] = useState("MUSOU STORE");
  const [incentive, setIncentive] = useState("次回使える200円OFFクーポン");
  const [stage, setStage] = useState<Stage>("review");
  const [csvRows, setCsvRows] = useState<{ order: string; name: string; product: string }[]>([]);

  const tpl = useMemo(() => template(stage, shop, incentive), [stage, shop, incentive]);

  function onCsv(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const all = parseCSV(t).filter((r) => r.some((c) => c.trim()));
      const body = all[0]?.some((c) => /注文|order|氏名|name|商品|product/i.test(c)) ? all.slice(1) : all;
      setCsvRows(body.map((r) => ({ order: r[0] ?? "", name: r[1] ?? "", product: r[2] ?? "" })));
    });
  }

  function fill(s: string, row: { order: string; name: string; product: string }) {
    return s
      .replaceAll("{order}", row.order)
      .replaceAll("{name}", row.name || "お客様")
      .replaceAll("{product}", row.product || "ご購入商品")
      .replaceAll("{shop}", shop);
  }

  function exportMerged() {
    downloadCSV(`followup-${stage}`, [
      ["注文番号", "宛名", "件名", "本文"],
      ...csvRows.map((r) => [r.order, r.name, fill(tpl.subject, r), fill(tpl.body, r)]),
    ]);
    recordHistory("followup-message", `${STAGE_LABEL[stage]} ${csvRows.length}件差し込み`, shop);
  }

  return (
    <ToolShell slug="followup-message">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="店舗名">
          <TextInput value={shop} onChange={(e) => setShop(e.target.value)} />
        </Field>
        <Field label="特典（任意）">
          <TextInput value={incentive} onChange={(e) => setIncentive(e.target.value)} />
        </Field>
      </div>

      <Field label="配信タイミング">
        <div className="flex flex-wrap gap-3 text-sm">
          {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
            <label key={s} className="flex items-center gap-1">
              <input type="radio" checked={stage === s} onChange={() => setStage(s)} />
              {STAGE_LABEL[s]}
            </label>
          ))}
        </div>
      </Field>

      <p className="text-xs text-[var(--muted)]">
        差し込みタグ：<code>{"{name}"}</code> <code>{"{order}"}</code> <code>{"{product}"}</code>{" "}
        <code>{"{shop}"}</code>
      </p>

      <CopyBox title={`件名: ${tpl.subject}`} text={`件名: ${tpl.subject}\n\n${tpl.body}`} rows={12} />

      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">CSV差し込み（注文番号, 氏名, 商品名）</p>
        <input type="file" accept=".csv" onChange={(e) => onCsv(e.target.files?.[0])} className="text-sm" />
        {csvRows.length > 0 && (
          <>
            <p className="mt-2 text-sm">{csvRows.length} 件読み込み。</p>
            <button
              onClick={exportMerged}
              className="mt-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              差し込み済みCSVを出力
            </button>
            <div className="mt-3 max-h-56 overflow-y-auto rounded-md border p-2 text-xs">
              {csvRows.slice(0, 5).map((r, i) => (
                <div key={i} className="mb-2 border-b pb-2">
                  <div className="font-semibold">{fill(tpl.subject, r)}</div>
                  <div className="whitespace-pre-wrap text-[var(--muted)]">{fill(tpl.body, r)}</div>
                </div>
              ))}
              {csvRows.length > 5 && <div>…ほか {csvRows.length - 5} 件</div>}
            </div>
          </>
        )}
      </div>
    </ToolShell>
  );
}
