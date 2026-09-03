"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field } from "@/components/ToolShell";
import { ExtensionNote } from "@/components/ExtensionNote";
import { downloadCSV } from "@/lib/csv";
import { recordHistory } from "@/lib/history";
import { useExtension, extRequest } from "@/lib/extension";
import { DownloadButton } from "@/components/DownloadButton";

interface Extracted {
  label: string;
  name: string;
  price: number | null;
  point: number | null;
  reviewCount: number | null;
  rating: number | null;
  shop: string;
  freeShip: boolean;
  fast: boolean;
  jan: string;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extract(html: string, label: string): Extracted {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // ── 1) JSON-LD（最も信頼できる）
  let ldPrice: number | null = null;
  let ldRating: number | null = null;
  let ldReview: number | null = null;
  let ldName = "";
  for (const s of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const j = JSON.parse(s.textContent || "");
      const nodes = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
      for (const n of nodes) {
        if (!n || typeof n !== "object") continue;
        if (!/product/i.test(String(n["@type"] || ""))) continue;
        if (!ldName && n.name) ldName = String(n.name);
        const off = Array.isArray(n.offers) ? n.offers[0] : n.offers;
        if (off) ldPrice = ldPrice ?? num(off.price ?? off.lowPrice ?? off.highPrice);
        const ar = n.aggregateRating;
        if (ar) {
          if (ldRating == null && ar.ratingValue != null) ldRating = parseFloat(ar.ratingValue);
          ldReview = ldReview ?? num(ar.reviewCount ?? ar.ratingCount);
        }
      }
    } catch {
      /* ignore */
    }
  }

  // ── 2) 楽天の埋め込みJS
  const scripts = Array.from(doc.querySelectorAll("script"))
    .map((s) => s.textContent || "")
    .join("\n");
  const grab = (re: RegExp): number | null => {
    const m = scripts.match(re);
    return m ? num(m[1]) : null;
  };
  const jsPrice = grab(/"itemPrice"\s*:\s*"?(\d{2,8})"?/) ?? grab(/"price"\s*:\s*"?(\d{2,8})"?/);
  const jsReview = grab(/"reviewCount"\s*:\s*"?(\d{1,7})"?/) ?? grab(/"reviewNum"\s*:\s*"?(\d{1,7})"?/);
  const jsRatingM = scripts.match(/"(?:reviewAverage|ratingValue|reviewAvg)"\s*:\s*"?([0-5](?:\.\d+)?)"?/);
  const jsRating = jsRatingM ? parseFloat(jsRatingM[1]) : null;

  const meta = (p: string) => doc.querySelector(`meta[property="${p}"], meta[name="${p}"]`)?.getAttribute("content") || "";
  const ipPrice = num(
    doc.querySelector('[itemprop="price"]')?.getAttribute("content") || doc.querySelector('[itemprop="price"]')?.textContent,
  );

  // ── 3) 可視テキスト（script/style を除去してから）
  doc.querySelectorAll("script, style, noscript, template").forEach((el) => el.remove());
  const text = (doc.body?.textContent || "").replace(/\s+/g, " ");
  let textPrice: number | null = null;
  const freq = new Map<number, number>();
  for (const m of text.matchAll(/([1-9][\d,]{2,8})\s*円/g)) {
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (n >= 100 && n <= 3_000_000) freq.set(n, (freq.get(n) || 0) + 1);
  }
  if (freq.size) textPrice = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];

  const price = ldPrice ?? jsPrice ?? ipPrice ?? textPrice;

  const name =
    ldName ||
    (doc.querySelector("h1")?.textContent || "").trim() ||
    meta("og:title") ||
    (doc.querySelector("title")?.textContent || "").trim();

  const rcM = text.match(/(?:レビュー|口コミ|評価)\D{0,8}([\d,]+)\s*件/) || text.match(/([\d,]+)\s*件のレビュー/);
  const reviewCount = ldReview ?? jsReview ?? (rcM ? parseInt(rcM[1].replace(/,/g, ""), 10) : null);

  let rating = ldRating ?? jsRating;
  if (rating == null) {
    const m = text.match(/([0-5](?:\.\d{1,2})?)\s*(?:点|\/\s*5|★)/);
    if (m) rating = parseFloat(m[1]);
  }

  const pointM = text.match(/([\d,]{1,7})\s*(?:ポイント|pt)\b/i);
  let point = pointM ? parseInt(pointM[1].replace(/,/g, ""), 10) : null;
  if (point != null && price != null && point >= price) point = null; // 誤検出ガード

  const janM = text.match(/\b(\d{13})\b/);

  return {
    label,
    name: name.slice(0, 80),
    price: price ?? null,
    point,
    reviewCount: reviewCount ?? null,
    rating: rating != null && rating >= 0 && rating <= 5 ? rating : null,
    shop: meta("og:site_name") || "",
    freeShip: /送料無料/.test(text),
    fast: /(あす楽|翌日配送|即日発送|365日発送)/.test(text),
    jan: janM ? janM[1] : "",
  };
}

export default function RakutenCompetitor() {
  const [blocks, setBlocks] = useState<{ label: string; url: string; html: string }[]>([
    { label: "競合A", url: "", html: "" },
    { label: "競合B", url: "", html: "" },
  ]);
  const { ready: extReady } = useExtension();
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [bulk, setBulk] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  async function runBulk() {
    const urls = bulk
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      // 各行の先頭カラムをURLとみなす（ラベル,URL のようなCSVにも対応）
      .map((l) => {
        const cols = l.split(/[\t,]/).map((s) => s.trim());
        return cols.find((c) => /^https?:\/\//i.test(c)) || cols[cols.length - 1] || l;
      })
      .filter((u) => !/^(url|競合|ラベル)/i.test(u)) // ヘッダー行を除去
      .filter(Boolean)
      .map((u) => (/^https?:\/\//i.test(u) ? u : "https://" + u));
    if (!urls.length) return;
    setBulkBusy(true);
    const fresh = urls.map((u, i) => ({ label: `競合${String.fromCharCode(65 + i)}`, url: u, html: "" }));
    setBlocks(fresh);
    for (let i = 0; i < fresh.length; i++) {
      setMsg(`一括取得 ${i + 1}/${fresh.length}…`);
      try {
        const r = await extRequest<{ text: string }>({ type: "fetchText", url: fresh[i].url }, 30000);
        fresh[i] = { ...fresh[i], html: r?.text || "" };
        setBlocks([...fresh]);
      } catch (e) {
        setMsg(`${fresh[i].label}: 取得エラー ${(e as Error).message}`);
      }
      await new Promise((res) => setTimeout(res, 300));
    }
    setMsg(`一括取得 完了（${fresh.length} 件）`);
    setBulkBusy(false);
  }

  async function fetchBlock(i: number) {
    const raw = blocks[i].url.trim();
    if (!raw) return;
    const u = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
    setBusyIdx(i);
    setMsg("");
    try {
      const r = await extRequest<{ text: string }>({ type: "fetchText", url: u }, 30000);
      if (r?.text) {
        setBlocks((bs) => bs.map((x, k) => (k === i ? { ...x, html: r.text } : x)));
        setMsg(`${blocks[i].label}: 取得 ${r.text.length.toLocaleString()} 文字`);
      } else setMsg(`${blocks[i].label}: 空の応答`);
    } catch (e) {
      setMsg(`${blocks[i].label}: 取得エラー ${(e as Error).message}`);
    } finally {
      setBusyIdx(null);
    }
  }

  const rows = useMemo(
    () => blocks.filter((b) => b.html.trim().length > 100).map((b) => extract(b.html, b.label)),
    [blocks],
  );

  function exportCsv() {
    const urlByLabel = new Map(blocks.map((b) => [b.label, b.url]));
    downloadCSV("rakuten-competitor", [
      ["ラベル", "URL", "商品名", "価格", "ポイント", "実質価格", "レビュー件数", "評価", "ショップ", "送料無料", "翌日配送", "JAN"],
      ...rows.map((r) => [
        r.label, urlByLabel.get(r.label) ?? "", r.name, r.price ?? "", r.point ?? "",
        r.price != null ? r.price - (r.point ?? 0) : "",
        r.reviewCount ?? "", r.rating ?? "", r.shop, r.freeShip ? "○" : "", r.fast ? "○" : "", r.jan,
      ]),
    ]);
    recordHistory("rakuten-competitor", `${rows.length}件を比較`, rows.map((r) => r.name.slice(0, 16)).join(" / "));
  }

  return (
    <ToolShell slug="rakuten-competitor">
      <ExtensionNote
        connected={extReady}
        auto="各枠に競合商品ページのURL（楽天/Yahoo/Amazon）を入れて「拡張で取得」を押すと、HTMLを取得して価格・ポイント・レビュー等を自動抽出します。"
        manual="競合の商品ページを開き、ソース（Ctrl+U → 全選択コピー）を各枠に貼り付け。価格・ポイント・レビュー等を自動抽出します。"
      />

      {extReady && (
        <div className="card p-3">
          <p className="mb-1 text-sm font-semibold">URLをまとめて取得（1行1件）</p>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={4}
            placeholder={"https://item.rakuten.co.jp/shopA/xxxx/\nhttps://item.rakuten.co.jp/shopB/yyyy/\nhttps://store.shopping.yahoo.co.jp/..."}
            className="w-full rounded-md border px-3 py-2 font-mono text-xs"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={runBulk}
              disabled={bulkBusy || !bulk.trim()}
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {bulkBusy ? "取得中…" : "一括で取得して比較"}
            </button>
            <label className="cursor-pointer rounded-md border px-3 py-2 text-sm font-semibold">
              CSV/テキストを読み込む
              <input
                type="file"
                accept=".csv,.txt,text/plain,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const t = await f.text();
                  setBulk(
                    t
                      .split(/\r?\n/)
                      .filter((l) => l.trim())
                      .join("\n"),
                  );
                  e.target.value = "";
                }}
              />
            </label>
            <DownloadButton
              onDownload={() =>
                downloadCSV("competitor-template", [
                  ["競合URL"],
                  ["https://item.rakuten.co.jp/shopA/xxxx/"],
                  ["https://store.shopping.yahoo.co.jp/shopB/yyyy.html"],
                ])
              }
            >
              テンプレDL
            </DownloadButton>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">
            ※ 既存の枠は貼り付けたURLで置き換わります。取得後そのまま下の比較表・CSVに反映されます。
          </p>
        </div>
      )}

      <div className="space-y-3">
        {blocks.map((b, i) => (
          <div key={i} className="card p-3">
            <div className="mb-1 flex items-center gap-2">
              <input
                value={b.label}
                onChange={(e) => setBlocks(blocks.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                className="w-28 rounded-md border px-2 py-1 text-sm font-semibold"
              />
              {blocks.length > 1 && (
                <button onClick={() => setBlocks(blocks.filter((_, k) => k !== i))} className="rounded border px-2 py-0.5 text-xs">
                  削除
                </button>
              )}
            </div>
            {extReady && (
              <div className="mb-2 flex gap-2">
                <input
                  value={b.url}
                  onChange={(e) => setBlocks(blocks.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))}
                  placeholder="競合商品ページURL"
                  className="flex-1 rounded-md border px-2 py-1 text-xs"
                />
                <button
                  onClick={() => fetchBlock(i)}
                  disabled={busyIdx === i || !b.url.trim()}
                  className="shrink-0 rounded-md bg-[var(--brand)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busyIdx === i ? "取得中…" : "拡張で取得"}
                </button>
              </div>
            )}
            <textarea
              value={b.html}
              onChange={(e) => setBlocks(blocks.map((x, k) => (k === i ? { ...x, html: e.target.value } : x)))}
              rows={3}
              placeholder="競合商品ページのHTMLソースを貼り付け／上のURL＋「拡張で取得」でも可"
              className="w-full rounded-md border px-3 py-2 font-mono text-xs"
            />
          </div>
        ))}
        <button
          onClick={() => setBlocks([...blocks, { label: `競合${String.fromCharCode(65 + blocks.length)}`, url: "", html: "" }])}
          className="rounded-md border px-3 py-1.5 text-sm font-semibold"
        >
          + 競合枠を追加
        </button>
        {msg && <p className="text-xs text-[var(--muted)]">{msg}</p>}
      </div>

      {rows.length > 0 && (
        <>
          <Field label="">
            <DownloadButton onDownload={exportCsv} className="border-[var(--brand)]">
              比較表CSV
            </DownloadButton>
          </Field>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b text-left text-[var(--muted)]">
                  <th className="py-2 pr-3">ラベル</th>
                  <th className="py-2 pr-3">商品名</th>
                  <th className="py-2 pr-3">価格</th>
                  <th className="py-2 pr-3">ポイント</th>
                  <th className="py-2 pr-3">実質</th>
                  <th className="py-2 pr-3">レビュー</th>
                  <th className="py-2 pr-3">評価</th>
                  <th className="py-2 pr-3">送料無料</th>
                  <th className="py-2 pr-3">翌日</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 pr-3 font-semibold">{r.label}</td>
                    <td className="py-2 pr-3">{r.name || "—"}</td>
                    <td className="py-2 pr-3">{r.price != null ? `¥${r.price.toLocaleString()}` : "—"}</td>
                    <td className="py-2 pr-3">{r.point != null ? r.point.toLocaleString() : "—"}</td>
                    <td className="py-2 pr-3">{r.price != null ? `¥${(r.price - (r.point ?? 0)).toLocaleString()}` : "—"}</td>
                    <td className="py-2 pr-3">{r.reviewCount != null ? `${r.reviewCount.toLocaleString()}件` : "—"}</td>
                    <td className="py-2 pr-3">{r.rating != null ? r.rating.toFixed(2) : "—"}</td>
                    <td className="py-2 pr-3">{r.freeShip ? "○" : "—"}</td>
                    <td className="py-2 pr-3">{r.fast ? "○" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--muted)]">
            ※ 楽天の商品ページ構造は頻繁に変わるため、抽出できない項目は「—」表示になります。値は必ず目視で確認してください。
          </p>
        </>
      )}
    </ToolShell>
  );
}
