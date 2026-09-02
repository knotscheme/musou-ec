"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, Stat, TextInput } from "@/components/ToolShell";
import { ExtensionNote } from "@/components/ExtensionNote";
import { CopyBox } from "@/components/CopyBox";
import { wordFrequency } from "@/lib/text";
import { recordHistory } from "@/lib/history";

interface Analysis {
  title: string;
  metaDesc: string;
  canonical: string;
  h1: string[];
  headings: { level: number; text: string }[];
  imgCount: number;
  imgWithAlt: number;
  imgList: { src: string; alt: string }[];
  textLen: number;
  pCount: number;
  linkInternal: number;
  linkExternal: number;
  jsonLdTypes: string[];
  iframeCount: number;
  videoCount: number;
  outline: { tag: string; cls: string; len: number }[];
  words: { word: string; n: number }[];
}

function analyze(html: string, baseHost: string): Analysis {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const q = <T extends Element>(s: string) => Array.from(doc.querySelectorAll<T>(s));

  const headings = q<HTMLElement>("h1,h2,h3,h4").map((h) => ({
    level: Number(h.tagName[1]),
    text: (h.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
  }));
  const imgs = q<HTMLImageElement>("img");
  const imgList = imgs.slice(0, 40).map((i) => ({
    src: (i.getAttribute("src") || i.getAttribute("data-src") || "").slice(0, 120),
    alt: (i.getAttribute("alt") || "").slice(0, 80),
  }));
  const links = q<HTMLAnchorElement>("a[href]");
  let internal = 0;
  let external = 0;
  for (const a of links) {
    const href = a.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href)) {
      if (baseHost && href.includes(baseHost)) internal++;
      else external++;
    } else if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) internal++;
  }
  const jsonLd = q<HTMLScriptElement>('script[type="application/ld+json"]');
  const jsonLdTypes: string[] = [];
  for (const s of jsonLd) {
    try {
      const j = JSON.parse(s.textContent || "");
      const arr = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
      for (const node of arr) if (node && node["@type"]) jsonLdTypes.push(String(node["@type"]));
    } catch {
      /* ignore */
    }
  }

  const body = doc.body;
  const textLen = (body?.textContent || "").replace(/\s+/g, "").length;
  const container = doc.querySelector("main, article, [role='main']") || body;
  const outline = container
    ? Array.from(container.children)
        .slice(0, 30)
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute("class") || "").split(/\s+/).slice(0, 2).join(" "),
          len: (el.textContent || "").replace(/\s+/g, "").length,
        }))
        .filter((o) => o.len > 0 || o.tag === "img" || o.tag === "hr")
    : [];

  return {
    title: (doc.querySelector("title")?.textContent || "").trim(),
    metaDesc: doc.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "",
    canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
    h1: q<HTMLElement>("h1").map((h) => (h.textContent || "").trim()),
    headings,
    imgCount: imgs.length,
    imgWithAlt: imgs.filter((i) => (i.getAttribute("alt") || "").trim()).length,
    imgList,
    textLen,
    pCount: q("p").length,
    linkInternal: internal,
    linkExternal: external,
    jsonLdTypes: [...new Set(jsonLdTypes)],
    iframeCount: q("iframe").length,
    videoCount: q("video").length,
    outline,
    words: wordFrequency(body?.textContent || "", 3).slice(0, 30),
  };
}

export default function PageReverse() {
  const [html, setHtml] = useState("");
  const [url, setUrl] = useState("");

  const host = useMemo(() => {
    try {
      return url ? new URL(/^https?:\/\//.test(url) ? url : "https://" + url).host : "";
    } catch {
      return "";
    }
  }, [url]);

  const a = useMemo(() => (html.trim().length > 50 ? analyze(html, host) : null), [html, host]);

  const outlineText = useMemo(() => {
    if (!a) return "";
    const lines = a.headings.map((h) => `${"  ".repeat(h.level - 1)}${"#".repeat(h.level)} ${h.text}`);
    return lines.join("\n");
  }, [a]);

  return (
    <ToolShell slug="page-reverse">
      <ExtensionNote
        auto="競合ページのURLを指定するだけで、拡張があなたのブラウザからHTMLを取得し自動解析します。"
        manual="競合ページを開き、右クリック →「ページのソースを表示」→ 全選択コピー → 下に貼り付け。"
      />

      <Field label="ページURL（任意・内部/外部リンク判定に使用）">
        <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://item.rakuten.co.jp/shop/xxxx/" />
      </Field>
      <Field label="ページのHTMLソース">
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={6}
          placeholder="ページのソース（Ctrl+U → 全選択コピー）を貼り付け"
          className="w-full rounded-md border px-3 py-2 font-mono text-xs"
        />
      </Field>

      {a && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="本文の文字数" value={a.textLen.toLocaleString()} />
            <Stat label="画像枚数" value={`${a.imgCount}`} />
            <Stat label="alt付き画像" value={`${a.imgWithAlt}/${a.imgCount}`} tone={a.imgCount && a.imgWithAlt / a.imgCount < 0.7 ? "warn" : "ok"} />
            <Stat label="見出し数" value={`${a.headings.length}`} />
            <Stat label="段落 <p>" value={`${a.pCount}`} />
            <Stat label="内部/外部リンク" value={`${a.linkInternal} / ${a.linkExternal}`} />
            <Stat label="動画 / iframe" value={`${a.videoCount} / ${a.iframeCount}`} />
            <Stat label="構造化データ" value={a.jsonLdTypes.length ? a.jsonLdTypes.join(", ") : "なし"} tone={a.jsonLdTypes.length ? "ok" : "warn"} />
          </div>

          <div className="card p-4 text-sm">
            <div><b>title：</b>{a.title || "—"}（{[...a.title].length}字）</div>
            <div className="mt-1"><b>meta description：</b>{a.metaDesc || "—"}（{[...a.metaDesc].length}字）</div>
            <div className="mt-1"><b>canonical：</b><span className="break-all">{a.canonical || "—"}</span></div>
            <div className="mt-1"><b>h1：</b>{a.h1.join(" / ") || "—"}</div>
          </div>

          {outlineText && <CopyBox title="見出し構成（Markdown）" text={outlineText} rows={8} />}

          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold">セクション構成（main/article 直下）</p>
            <div className="space-y-1 text-xs">
              {a.outline.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-16 shrink-0 font-mono text-[var(--muted)]">{o.tag}</span>
                  <span className="flex-1 truncate text-[var(--muted)]">{o.cls}</span>
                  <span className="w-16 text-right">{o.len}字</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold">頻出語（3回以上）</p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {a.words.map((w) => (
                <span key={w.word} className="rounded border px-2 py-0.5">
                  {w.word} <span className="text-[var(--muted)]">{w.n}</span>
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => recordHistory("page-reverse", `${a.imgCount}画像 / ${a.textLen}字 / 見出し${a.headings.length}`, a.title.slice(0, 50))}
            className="rounded-md border px-4 py-2 text-sm font-semibold"
          >
            履歴に保存
          </button>
        </>
      )}
    </ToolShell>
  );
}
