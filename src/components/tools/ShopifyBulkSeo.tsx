"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader, findCol } from "@/lib/csvmap";
import { generateText, hasApiKey } from "@/lib/byok";
import { recordHistory } from "@/lib/history";

interface Row {
  handle: string;
  title: string;
  body: string;
  vendor: string;
  type: string;
}
interface Out extends Row {
  metaDesc: string;
  alt: string;
  ogp: string;
  error?: string;
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export default function ShopifyBulkSeo() {
  const [rows, setRows] = useState<Row[]>([]);
  const [outs, setOuts] = useState<Out[]>([]);
  const [lang, setLang] = useState("日本語");
  const [tone, setTone] = useState("自然で具体的な");
  const [genMeta, setGenMeta] = useState(true);
  const [genAlt, setGenAlt] = useState(true);
  const [genOgp, setGenOgp] = useState(false);
  const [limit, setLimit] = useState(20);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const keyReady = typeof window !== "undefined" && hasApiKey();

  function onFile(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iHandle = findCol(header, ["handle", "商品コード", "商品管理番号", "sku"]);
      const iTitle = findCol(header, ["title", "商品名", "name"]);
      const iBody = findCol(header, ["body (html)", "body html", "商品説明", "description"]);
      const iVendor = findCol(header, ["vendor", "ブランド", "メーカー", "brand"]);
      const iType = findCol(header, ["type", "product category", "カテゴリ", "商品タイプ"]);
      const parsed: Row[] = rows
        .map((r) => ({
          handle: iHandle >= 0 ? r[iHandle] ?? "" : "",
          title: iTitle >= 0 ? r[iTitle] ?? "" : r[0] ?? "",
          body: iBody >= 0 ? stripHtml(r[iBody] ?? "") : "",
          vendor: iVendor >= 0 ? r[iVendor] ?? "" : "",
          type: iType >= 0 ? r[iType] ?? "" : "",
        }))
        .filter((r) => r.title.trim());
      // Shopifyのエクスポートは1商品が複数行（バリエーション）→ Title 空行を除外済み。念のため Title で重複排除
      const seen = new Set<string>();
      setRows(parsed.filter((r) => (seen.has(r.title) ? false : (seen.add(r.title), true))));
      setOuts([]);
    });
  }

  async function run(n: number) {
    if (!hasApiKey()) return;
    const target = rows.slice(0, n);
    setRunning(true);
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    const results: Out[] = [];
    for (let i = 0; i < target.length; i++) {
      if (ac.signal.aborted) break;
      const r = target[i];
      const want: string[] = [];
      if (genMeta) want.push('metaDesc: 検索結果向けの説明文（' + lang + '・120〜140字・キーワードを自然に含める・誇大表現/薬機法NG表現なし）');
      if (genAlt) want.push('alt: 商品メイン画像の代替テキスト（' + lang + '・40字以内・視覚的特徴＋商品名）');
      if (genOgp) want.push('ogp: SNSシェア用の短い訴求文（' + lang + '・60字以内）');
      const prompt =
        `次の商品について、指定フィールドを${tone}トーンで作成し、JSONのみを返してください。\n` +
        `商品名: ${r.title}\n` +
        (r.vendor ? `ブランド: ${r.vendor}\n` : "") +
        (r.type ? `カテゴリ: ${r.type}\n` : "") +
        (r.body ? `説明(抜粋): ${r.body.slice(0, 400)}\n` : "") +
        `\n出力フィールド:\n- ${want.join("\n- ")}\n` +
        `\n返答は {"metaDesc":"...","alt":"...","ogp":"..."} の形式のJSONのみ。生成しないフィールドは空文字。`;
      try {
        const txt = await generateText(prompt, { temperature: 0.6, signal: ac.signal });
        const jsonStr = txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1);
        const parsed = JSON.parse(jsonStr);
        results.push({
          ...r,
          metaDesc: parsed.metaDesc ?? "",
          alt: parsed.alt ?? "",
          ogp: parsed.ogp ?? "",
        });
      } catch (e) {
        results.push({ ...r, metaDesc: "", alt: "", ogp: "", error: (e as Error).message });
      }
      setProgress(i + 1);
      setOuts([...results]);
      await new Promise((res) => setTimeout(res, 350));
    }
    setRunning(false);
    abortRef.current = null;
    recordHistory("shopify-bulk-seo", `${results.length}件のメタ情報生成`, `失敗 ${results.filter((r) => r.error).length}`);
  }

  function stop() {
    abortRef.current?.abort();
    setRunning(false);
  }

  function exportCsv() {
    downloadCSV("shopify-meta", [
      ["Handle", "Title", "Metafield: meta description", "Image Alt Text", "OGP"],
      ...outs.map((o) => [o.handle, o.title, o.metaDesc, o.alt, o.ogp]),
    ]);
  }

  return (
    <ToolShell slug="shopify-bulk-seo">
      {!keyReady && (
        <div className="rounded-lg border-2 p-3 text-sm" style={{ borderColor: "#a1701c" }}>
          AI機能を使うには
          <Link href="/settings/" className="mx-1 font-semibold text-[var(--brand)] underline">設定画面</Link>
          で Gemini API キーを登録してください（全ツール共通）。
        </div>
      )}

      <div className="card border-dashed p-4">
        <input type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Shopify の商品エクスポートCSV（Handle / Title / Body (HTML) / Vendor / Type）に対応。読み込み後、Title重複（バリエーション行）は自動で1件に集約。
        </p>
        {rows.length > 0 && <p className="mt-1 text-sm">{rows.length} 商品を読み込みました。</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="言語"><TextInput value={lang} onChange={(e) => setLang(e.target.value)} /></Field>
        <Field label="トーン"><TextInput value={tone} onChange={(e) => setTone(e.target.value)} /></Field>
        <Field label="処理する件数" hint="APIコストと時間に直結。まず少数で試す">
          <TextInput type="number" value={limit} onChange={(e) => setLimit(+e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1"><input type="checkbox" checked={genMeta} onChange={(e) => setGenMeta(e.target.checked)} />meta description</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={genAlt} onChange={(e) => setGenAlt(e.target.checked)} />画像 alt</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={genOgp} onChange={(e) => setGenOgp(e.target.checked)} />OGP文言</label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => run(3)}
          disabled={running || !keyReady || rows.length === 0}
          className="rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          テスト（先頭3件）
        </button>
        <button
          onClick={() => run(limit)}
          disabled={running || !keyReady || rows.length === 0}
          className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {running ? `生成中… ${progress}/${Math.min(limit, rows.length)}` : `${Math.min(limit, rows.length)}件を生成`}
        </button>
        {running && (
          <button onClick={stop} className="rounded-md border px-4 py-2 text-sm font-semibold">中止</button>
        )}
        {outs.length > 0 && !running && (
          <button onClick={exportCsv} className="rounded-md border px-4 py-2 text-sm font-semibold">CSV出力</button>
        )}
      </div>

      {outs.length > 0 && (
        <div className="space-y-2">
          {outs.map((o, i) => (
            <div key={i} className="card p-3 text-sm">
              <div className="font-semibold">{o.title}</div>
              {o.error ? (
                <div className="text-[#bf0000]">⚠ {o.error}</div>
              ) : (
                <div className="mt-1 space-y-1 text-[var(--muted)]">
                  {o.metaDesc && <div><b className="text-[var(--foreground)]">meta:</b> {o.metaDesc} <span className="text-xs">({[...o.metaDesc].length}字)</span></div>}
                  {o.alt && <div><b className="text-[var(--foreground)]">alt:</b> {o.alt}</div>}
                  {o.ogp && <div><b className="text-[var(--foreground)]">ogp:</b> {o.ogp}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--muted)]">
        出力CSVの「Metafield: meta description」列は、Shopify の <code>global.description_tag</code> メタフィールド一括インポート
        （Matrixify 等）を想定した名前です。取り込み前に内容を確認し、必要に応じて
        <Link href="/tools/ng-word-checker/" className="mx-1 text-[var(--brand)] underline">NGワードチェッカー</Link>
        で確認してください。
      </p>
    </ToolShell>
  );
}
