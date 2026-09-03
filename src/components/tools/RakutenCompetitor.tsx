"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field } from "@/components/ToolShell";
import { ExtensionNote } from "@/components/ExtensionNote";
import { downloadCSV } from "@/lib/csv";
import { recordHistory } from "@/lib/history";
import { useExtension, extRequest } from "@/lib/extension";

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

function extract(html: string, label: string): Extracted {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = (doc.body?.textContent || "").replace(/\s+/g, " ");

  const meta = (p: string) => doc.querySelector(`meta[property="${p}"], meta[name="${p}"]`)?.getAttribute("content") || "";
  const name =
    (doc.querySelector("h1")?.textContent || "").trim() ||
    meta("og:title") ||
    (doc.querySelector("title")?.textContent || "").trim();

  const itempropPrice = doc.querySelector('[itemprop="price"]')?.getAttribute("content") ||
    doc.querySelector('[itemprop="price"]')?.textContent || "";
  const priceCandidates: number[] = [];
  const ip = parseInt(itempropPrice.replace(/[^\d]/g, ""), 10);
  if (ip) priceCandidates.push(ip);
  for (const m of text.matchAll(/([\d,]{3,})\s*円/g)) {
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (n >= 100 && n <= 5_000_000) priceCandidates.push(n);
  }
  for (const m of text.matchAll(/[¥￥]\s?([\d,]{3,})/g)) {
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (n >= 100 && n <= 5_000_000) priceCandidates.push(n);
  }
  const price = priceCandidates.length
    ? priceCandidates.sort((a, b) => countOcc(text, String(a)) - countOcc(text, String(b))).pop() ?? priceCandidates[0]
    : null;

  const pointM = text.match(/([\d,]+)\s*(?:ポイント|pt|P)\b/i) || text.match(/ポイント\s*([\d,]+)/);
  const point = pointM ? parseInt(pointM[1].replace(/,/g, ""), 10) : null;

  const rcM =
    text.match(/(?:レビュー|口コミ|評価)\D{0,8}([\d,]+)\s*件/) ||
    text.match(/([\d,]+)\s*件のレビュー/) ||
    (doc.querySelector('[itemprop="reviewCount"]')?.getAttribute("content")
      ? [null, doc.querySelector('[itemprop="reviewCount"]')!.getAttribute("content")!]
      : null);
  const reviewCount = rcM ? parseInt(String(rcM[1]).replace(/,/g, ""), 10) : null;

  const rtM =
    (doc.querySelector('[itemprop="ratingValue"]')?.getAttribute("content")
      ? [null, doc.querySelector('[itemprop="ratingValue"]')!.getAttribute("content")!]
      : null) ||
    text.match(/([0-5](?:\.\d{1,2})?)\s*(?:点|\/\s*5|★)/);
  const rating = rtM ? parseFloat(String(rtM[1])) : null;

  const janM = text.match(/\b(\d{13})\b/);

  return {
    label,
    name: name.slice(0, 80),
    price,
    point,
    reviewCount,
    rating: rating != null && rating <= 5 ? rating : null,
    shop: meta("og:site_name") || "",
    freeShip: /送料無料/.test(text),
    fast: /(あす楽|翌日配送|即日発送|365日発送)/.test(text),
    jan: janM ? janM[1] : "",
  };
}

function countOcc(hay: string, needle: string): number {
  return hay.split(needle).length - 1;
}

export default function RakutenCompetitor() {
  const [blocks, setBlocks] = useState<{ label: string; url: string; html: string }[]>([
    { label: "競合A", url: "", html: "" },
    { label: "競合B", url: "", html: "" },
  ]);
  const { ready: extReady } = useExtension();
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

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
    downloadCSV("rakuten-competitor", [
      ["ラベル", "商品名", "価格", "ポイント", "実質価格", "レビュー件数", "評価", "ショップ", "送料無料", "翌日配送", "JAN"],
      ...rows.map((r) => [
        r.label, r.name, r.price ?? "", r.point ?? "",
        r.price != null ? r.price - (r.point ?? 0) : "",
        r.reviewCount ?? "", r.rating ?? "", r.shop, r.freeShip ? "○" : "", r.fast ? "○" : "", r.jan,
      ]),
    ]);
    recordHistory("rakuten-competitor", `${rows.length}件を比較`, rows.map((r) => r.name.slice(0, 16)).join(" / "));
  }

  return (
    <ToolShell slug="rakuten-competitor">
      <ExtensionNote
        auto="競合商品ページのURLを登録すると、拡張が定期的に価格・ポイント・レビュー・順位を取得し推移を記録します。"
        manual="競合の商品ページを開き、ソース（Ctrl+U → 全選択コピー）を各枠に貼り付け。価格・ポイント・レビュー等を自動抽出します。"
      />

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
            <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              比較表CSV
            </button>
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
