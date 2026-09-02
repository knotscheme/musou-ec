"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { CopyBox } from "@/components/CopyBox";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader, findCol } from "@/lib/csvmap";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/i18n/dictionaries";
import {
  SHIP_TEMPLATE,
  NOTICE_LABEL,
  CARRIERS,
  trackingUrl,
  fillTemplate,
  type ShipFields,
  type NoticeType,
} from "@/lib/shipmsg";
import { recordHistory } from "@/lib/history";

type BaseFields = Omit<ShipFields, "shop" | "trackingUrl" | "carrier">;

export default function ShippingNotice() {
  const [type, setType] = useState<NoticeType>("shipped");
  const [shop, setShop] = useState("MUSOU STORE");
  const [f, setF] = useState<BaseFields>({
    name: "山田 太郎",
    order: "#1024",
    product: "アウトドアチェア 軽量 折りたたみ",
    tracking: "1234-5678-9012",
    shipDate: new Date().toLocaleDateString(),
    eta: "2〜4日",
    reason: "一時的な在庫切れのため",
    nextEta: "3営業日以内",
    shippedItems: "アウトドアチェア 軽量 折りたたみ ×1",
    backorderItems: "専用収納ケース ×1",
  });
  const [carrierId, setCarrierId] = useState("yamato");
  const [manualUrl, setManualUrl] = useState("");
  const [langs, setLangs] = useState<Record<Locale, boolean>>({
    ja: true, en: true, zh: false, de: false, fr: false, es: false,
  });

  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvLang, setCsvLang] = useState<Locale>("ja");

  const usesTracking = type !== "delay";

  const { fields, selected, tUrl } = useMemo(() => {
    const carrierLabel = CARRIERS.find((c) => c.id === carrierId)?.label ?? "";
    const url = trackingUrl(carrierId, f.tracking, manualUrl);
    return {
      fields: { ...f, shop, carrier: carrierLabel, trackingUrl: url } as ShipFields,
      selected: LOCALES.filter((l) => langs[l]),
      tUrl: url,
    };
  }, [f, shop, carrierId, manualUrl, langs]);

  const outputs = useMemo(
    () =>
      selected.map((l) => ({
        locale: l,
        subject: fillTemplate(SHIP_TEMPLATE[type][l].subject, fields),
        body: fillTemplate(SHIP_TEMPLATE[type][l].body, fields),
      })),
    [type, fields, selected],
  );

  function onCsv(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const idx = {
        name: findCol(header, ["宛名", "氏名", "name", "お客様名", "customer name"]),
        order: findCol(header, ["注文番号", "order", "order number", "注文id"]),
        product: findCol(header, ["商品名", "product", "item", "商品"]),
        tracking: findCol(header, ["追跡番号", "tracking", "伝票番号", "お問い合わせ番号"]),
        eta: findCol(header, ["お届け目安", "eta", "delivery"]),
        member: findCol(header, ["会員id", "memberid", "customer id", "顧客id"]),
      };
      setCsvRows(
        rows.map((r) => ({
          name: idx.name >= 0 ? r[idx.name] ?? "" : "",
          order: idx.order >= 0 ? r[idx.order] ?? "" : "",
          product: idx.product >= 0 ? r[idx.product] ?? "" : "",
          tracking: idx.tracking >= 0 ? r[idx.tracking] ?? "" : "",
          eta: idx.eta >= 0 ? r[idx.eta] ?? "" : f.eta,
          member: idx.member >= 0 ? r[idx.member] ?? "" : "",
        })),
      );
    });
  }

  function exportCsv() {
    const tpl = SHIP_TEMPLATE[type][csvLang];
    downloadCSV(`notice-${type}-${csvLang}`, [
      ["注文番号", "宛名", "会員ID", "件名", "本文"],
      ...csvRows.map((row) => {
        const ff: ShipFields = {
          ...f,
          shop,
          name: row.name,
          order: row.order,
          product: row.product || f.product,
          carrier: fields.carrier,
          tracking: row.tracking,
          trackingUrl: trackingUrl(carrierId, row.tracking, manualUrl),
          eta: row.eta || f.eta,
        };
        return [row.order, row.name, row.member ?? "", fillTemplate(tpl.subject, ff), fillTemplate(tpl.body, ff)];
      }),
    ]);
    recordHistory(
      "shipping-notice",
      `${NOTICE_LABEL[type]} ${csvRows.length}件（${LOCALE_LABEL[csvLang]}）`,
      shop,
    );
  }

  return (
    <ToolShell slug="shipping-notice">
      <Field label="連絡タイプ">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(NOTICE_LABEL) as NoticeType[]).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                type === t ? "border-[var(--brand)] bg-[var(--surface-soft)] font-semibold" : ""
              }`}
            >
              <input type="radio" className="mr-1" checked={type === t} onChange={() => setType(t)} />
              {NOTICE_LABEL[t]}
            </label>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="ショップ名"><TextInput value={shop} onChange={(e) => setShop(e.target.value)} /></Field>
        <Field label="宛名"><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="注文番号"><TextInput value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} /></Field>

        {type === "partial" ? (
          <>
            <Field label="本日発送分の商品"><TextInput value={f.shippedItems} onChange={(e) => setF({ ...f, shippedItems: e.target.value })} /></Field>
            <Field label="次回発送分（欠品中）"><TextInput value={f.backorderItems} onChange={(e) => setF({ ...f, backorderItems: e.target.value })} /></Field>
            <Field label="次回発送の予定"><TextInput value={f.nextEta} onChange={(e) => setF({ ...f, nextEta: e.target.value })} /></Field>
          </>
        ) : (
          <Field label="商品名"><TextInput value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} /></Field>
        )}

        {type === "delay" && (
          <>
            <Field label="遅延の理由"><TextInput value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
            <Field label="新しい発送予定"><TextInput value={f.nextEta} onChange={(e) => setF({ ...f, nextEta: e.target.value })} /></Field>
          </>
        )}

        {type !== "delay" && (
          <Field label="発送日"><TextInput value={f.shipDate} onChange={(e) => setF({ ...f, shipDate: e.target.value })} /></Field>
        )}
        <Field label={type === "overseas" ? "お届け目安（幅を持たせる）" : "お届け目安"}>
          <TextInput value={f.eta} onChange={(e) => setF({ ...f, eta: e.target.value })} />
        </Field>

        {usesTracking && (
          <>
            <Field label="配送業者">
              <select value={carrierId} onChange={(e) => setCarrierId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
                {CARRIERS.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="追跡番号"><TextInput value={f.tracking} onChange={(e) => setF({ ...f, tracking: e.target.value })} /></Field>
            {carrierId === "other" && (
              <Field label="追跡URL（手入力）"><TextInput value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} /></Field>
            )}
          </>
        )}
      </div>

      <Field label="出力する言語">
        <div className="flex flex-wrap gap-2">
          {LOCALES.map((l) => (
            <label
              key={l}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                langs[l] ? "border-[var(--brand)] bg-[var(--surface-soft)] font-semibold" : ""
              }`}
            >
              <input type="checkbox" className="mr-1" checked={langs[l]} onChange={(e) => setLangs({ ...langs, [l]: e.target.checked })} />
              {LOCALE_LABEL[l]}
            </label>
          ))}
        </div>
      </Field>

      {usesTracking && (
        <p className="text-xs text-[var(--muted)]">
          追跡URLプレビュー：
          <a href={tUrl} target="_blank" rel="noreferrer" className="break-all text-[var(--brand)] underline">
            {tUrl || "（未設定）"}
          </a>
        </p>
      )}

      <div className="space-y-3">
        {outputs.map((o) => (
          <CopyBox key={o.locale} title={`${LOCALE_LABEL[o.locale]}｜件名: ${o.subject}`} text={`${o.subject}\n\n${o.body}`} rows={15} />
        ))}
      </div>

      <div className="card p-4">
        <p className="mb-1 text-sm font-semibold">CSV一括生成</p>
        <p className="mb-2 text-xs text-[var(--muted)]">
          列：注文番号 / 宛名 / 商品名 / 追跡番号 / お届け目安 / 会員ID（任意）。会員ID空欄はゲスト注文として扱えます。
          出力CSV（件名・本文）を各モールのメール機能・メルマガ/LINE配信ツールに貼り付けて使用します。
        </p>
        <input type="file" accept=".csv" onChange={(e) => onCsv(e.target.files?.[0])} className="text-sm" />
        {csvRows.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm">{csvRows.length} 件読み込み</span>
            <select value={csvLang} onChange={(e) => setCsvLang(e.target.value as Locale)} className="rounded-md border px-2 py-1 text-sm">
              {LOCALES.map((l) => (
                <option key={l} value={l}>{LOCALE_LABEL[l]}</option>
              ))}
            </select>
            <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              差し込み済みCSVを出力
            </button>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
