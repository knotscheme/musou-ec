"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { CopyBox } from "@/components/CopyBox";
import { recordHistory } from "@/lib/history";

type Avail = "InStock" | "OutOfStock" | "PreOrder" | "BackOrder";

interface Review {
  author: string;
  rating: string;
  body: string;
  date: string;
}
interface Faq {
  q: string;
  a: string;
}
interface Crumb {
  name: string;
  url: string;
}

export default function ShopifyJsonld() {
  const [useProduct, setUseProduct] = useState(true);
  const [useFaq, setUseFaq] = useState(false);
  const [useCrumb, setUseCrumb] = useState(true);

  // Product
  const [name, setName] = useState("アウトドアチェア 軽量 折りたたみ 900g");
  const [desc, setDesc] = useState("重量900gの超軽量アウトドアチェア。耐荷重120kg、専用収納袋つき。");
  const [brand, setBrand] = useState("MUSOU");
  const [sku, setSku] = useState("musou-chair-01");
  const [gtin, setGtin] = useState("4901234567894");
  const [images, setImages] = useState("https://example.com/img/chair-1.jpg\nhttps://example.com/img/chair-2.jpg");
  const [url, setUrl] = useState("https://example.com/products/outdoor-chair");
  const [price, setPrice] = useState("4980");
  const [currency, setCurrency] = useState("JPY");
  const [avail, setAvail] = useState<Avail>("InStock");

  // Rating
  const [useRating, setUseRating] = useState(true);
  const [ratingValue, setRatingValue] = useState("4.4");
  const [reviewCount, setReviewCount] = useState("58");
  const [reviews, setReviews] = useState<Review[]>([
    { author: "山田", rating: "5", body: "軽くて丈夫。設営も一瞬でした。", date: "2026-08-01" },
  ]);

  const [faqs, setFaqs] = useState<Faq[]>([
    { q: "耐荷重は？", a: "120kgまで対応しています。" },
    { q: "収納袋は付属しますか？", a: "はい、専用の収納袋が付属します。" },
  ]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([
    { name: "ホーム", url: "https://example.com/" },
    { name: "アウトドア", url: "https://example.com/collections/outdoor" },
    { name: "チェア", url: "https://example.com/collections/outdoor-chair" },
  ]);

  const json = useMemo(() => {
    const graph: Record<string, unknown>[] = [];

    if (useProduct) {
      const imgs = images.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      const product: Record<string, unknown> = {
        "@type": "Product",
        name,
        description: desc,
        ...(imgs.length ? { image: imgs } : {}),
        ...(brand ? { brand: { "@type": "Brand", name: brand } } : {}),
        ...(sku ? { sku } : {}),
        ...(gtin ? { gtin13: gtin } : {}),
        offers: {
          "@type": "Offer",
          ...(url ? { url } : {}),
          priceCurrency: currency,
          price: Number(price) || price,
          availability: `https://schema.org/${avail}`,
          itemCondition: "https://schema.org/NewCondition",
        },
      };
      if (useRating && Number(reviewCount) > 0) {
        product.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: Number(ratingValue) || ratingValue,
          reviewCount: Number(reviewCount) || reviewCount,
          bestRating: 5,
          worstRating: 1,
        };
      }
      const rv = reviews.filter((r) => r.body.trim());
      if (rv.length) {
        product.review = rv.map((r) => ({
          "@type": "Review",
          author: { "@type": "Person", name: r.author || "購入者" },
          reviewRating: { "@type": "Rating", ratingValue: Number(r.rating) || r.rating, bestRating: 5, worstRating: 1 },
          reviewBody: r.body,
          ...(r.date ? { datePublished: r.date } : {}),
        }));
      }
      graph.push(product);
    }

    if (useFaq) {
      const list = faqs.filter((f) => f.q.trim() && f.a.trim());
      if (list.length) {
        graph.push({
          "@type": "FAQPage",
          mainEntity: list.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        });
      }
    }

    if (useCrumb) {
      const list = crumbs.filter((c) => c.name.trim());
      if (list.length) {
        graph.push({
          "@type": "BreadcrumbList",
          itemListElement: list.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            ...(c.url ? { item: c.url } : {}),
          })),
        });
      }
    }

    if (graph.length === 0) return "";
    const doc =
      graph.length === 1
        ? { "@context": "https://schema.org", ...graph[0] }
        : { "@context": "https://schema.org", "@graph": graph };
    return JSON.stringify(doc, null, 2);
  }, [
    useProduct, useFaq, useCrumb, name, desc, brand, sku, gtin, images, url, price, currency, avail,
    useRating, ratingValue, reviewCount, reviews, faqs, crumbs,
  ]);

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (useProduct) {
      if (!name.trim()) w.push("Product: name が未入力（必須）");
      if (!price.trim()) w.push("Offer: price が未入力（必須）");
      if (!images.trim()) w.push("Product: image を1枚以上推奨（リッチリザルト要件）");
      if (!gtin.trim() && !sku.trim()) w.push("Product: sku か gtin13 のどちらかを推奨");
    }
    return w;
  }, [useProduct, name, price, images, gtin, sku]);

  const script = json ? `<script type="application/ld+json">\n${json}\n</script>` : "";

  return (
    <ToolShell slug="shopify-jsonld">
      <Field label="出力するスキーマ">
        <div className="flex flex-wrap gap-2">
          {[
            ["Product + Offer", useProduct, setUseProduct],
            ["FAQPage", useFaq, setUseFaq],
            ["BreadcrumbList", useCrumb, setUseCrumb],
          ].map(([label, val, set]) => (
            <label
              key={label as string}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${val ? "border-[var(--brand)] bg-[var(--surface-soft)] font-semibold" : ""}`}
            >
              <input
                type="checkbox"
                className="mr-1"
                checked={val as boolean}
                onChange={(e) => (set as (b: boolean) => void)(e.target.checked)}
              />
              {label as string}
            </label>
          ))}
        </div>
      </Field>

      {useProduct && (
        <div className="card space-y-3 p-4">
          <p className="text-sm font-semibold">Product / Offer</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="商品名"><TextInput value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="ブランド"><TextInput value={brand} onChange={(e) => setBrand(e.target.value)} /></Field>
            <Field label="SKU"><TextInput value={sku} onChange={(e) => setSku(e.target.value)} /></Field>
            <Field label="GTIN / JAN"><TextInput value={gtin} onChange={(e) => setGtin(e.target.value)} /></Field>
            <Field label="価格"><TextInput value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
            <Field label="通貨"><TextInput value={currency} onChange={(e) => setCurrency(e.target.value)} /></Field>
            <Field label="在庫状況">
              <select value={avail} onChange={(e) => setAvail(e.target.value as Avail)} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="InStock">InStock（在庫あり）</option>
                <option value="OutOfStock">OutOfStock（在庫切れ）</option>
                <option value="PreOrder">PreOrder（予約）</option>
                <option value="BackOrder">BackOrder（取り寄せ）</option>
              </select>
            </Field>
            <Field label="商品URL"><TextInput value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
          </div>
          <Field label="商品説明">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
          </Field>
          <Field label="画像URL（1行1件）">
            <textarea value={images} onChange={(e) => setImages(e.target.value)} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
          </Field>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={useRating} onChange={(e) => setUseRating(e.target.checked)} />
            AggregateRating / Review を含める
          </label>
          {useRating && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="平均評価（1〜5）"><TextInput value={ratingValue} onChange={(e) => setRatingValue(e.target.value)} /></Field>
                <Field label="レビュー件数"><TextInput value={reviewCount} onChange={(e) => setReviewCount(e.target.value)} /></Field>
              </div>
              {reviews.map((r, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_2fr_7rem_2rem]">
                  <TextInput placeholder="投稿者" value={r.author} onChange={(e) => setReviews(reviews.map((x, k) => (k === i ? { ...x, author: e.target.value } : x)))} />
                  <TextInput placeholder="★" value={r.rating} onChange={(e) => setReviews(reviews.map((x, k) => (k === i ? { ...x, rating: e.target.value } : x)))} />
                  <TextInput placeholder="本文" value={r.body} onChange={(e) => setReviews(reviews.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))} />
                  <TextInput placeholder="YYYY-MM-DD" value={r.date} onChange={(e) => setReviews(reviews.map((x, k) => (k === i ? { ...x, date: e.target.value } : x)))} />
                  <button onClick={() => setReviews(reviews.filter((_, k) => k !== i))} className="rounded border text-xs">×</button>
                </div>
              ))}
              <button onClick={() => setReviews([...reviews, { author: "", rating: "5", body: "", date: "" }])} className="rounded-md border px-3 py-1 text-xs font-semibold">
                + レビュー行
              </button>
              <p className="text-xs text-[var(--muted)]">
                ※ サイト上に実際に表示されているレビュー内容と一致させること（Googleのポリシー）。
              </p>
            </>
          )}
        </div>
      )}

      {useFaq && (
        <div className="card space-y-2 p-4">
          <p className="text-sm font-semibold">FAQPage</p>
          {faqs.map((f, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_2rem]">
              <TextInput placeholder="質問" value={f.q} onChange={(e) => setFaqs(faqs.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} />
              <TextInput placeholder="回答" value={f.a} onChange={(e) => setFaqs(faqs.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} />
              <button onClick={() => setFaqs(faqs.filter((_, k) => k !== i))} className="rounded border text-xs">×</button>
            </div>
          ))}
          <button onClick={() => setFaqs([...faqs, { q: "", a: "" }])} className="rounded-md border px-3 py-1 text-xs font-semibold">
            + FAQ行
          </button>
          <p className="text-xs text-[var(--muted)]">※ ページ内に同じQ&Aが実際に表示されている必要があります。</p>
        </div>
      )}

      {useCrumb && (
        <div className="card space-y-2 p-4">
          <p className="text-sm font-semibold">BreadcrumbList</p>
          {crumbs.map((c, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_2rem]">
              <TextInput placeholder="名称" value={c.name} onChange={(e) => setCrumbs(crumbs.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
              <TextInput placeholder="URL" value={c.url} onChange={(e) => setCrumbs(crumbs.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} />
              <button onClick={() => setCrumbs(crumbs.filter((_, k) => k !== i))} className="rounded border text-xs">×</button>
            </div>
          ))}
          <button onClick={() => setCrumbs([...crumbs, { name: "", url: "" }])} className="rounded-md border px-3 py-1 text-xs font-semibold">
            + 階層
          </button>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="card p-3 text-sm" style={{ borderColor: "#a1701c" }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ color: "#a1701c" }}>⚠ {w}</div>
          ))}
        </div>
      )}

      {script && (
        <>
          <CopyBox title="貼り付け用（theme.liquid / セクション内）" text={script} rows={16} />
          <p className="text-xs text-[var(--muted)]">
            テーマの <code>{"<head>"}</code> か商品テンプレートに貼り付け、
            <a href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer" className="mx-1 text-[var(--brand)] underline">
              リッチリザルトテスト
            </a>
            で検証してください。Liquidの動的値（<code>{"{{ product.title }}"}</code> 等）に置き換えると全商品で自動出力できます。
          </p>
        </>
      )}

      <button
        onClick={() => recordHistory("shopify-jsonld", "JSON-LDを生成", [useProduct && "Product", useFaq && "FAQ", useCrumb && "Breadcrumb"].filter(Boolean).join(" / "))}
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
