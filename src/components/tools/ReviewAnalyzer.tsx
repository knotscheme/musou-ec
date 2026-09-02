"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, Stat } from "@/components/ToolShell";
import { CopyBox } from "@/components/CopyBox";
import { recordHistory } from "@/lib/history";

const POS = [
  "良い", "よい", "満足", "最高", "リピート", "また買い", "丁寧", "早い", "速い", "迅速",
  "かわいい", "可愛い", "おしゃれ", "オシャレ", "コスパ", "使いやすい", "quality", "助かり",
  "ちょうどいい", "しっかり", "頑丈", "美味しい", "おいしい", "対応が良", "梱包",
];
const NEG = [
  "悪い", "不満", "最悪", "残念", "遅い", "雑", "傷", "不良", "がっかり", "におい", "臭い",
  "期待外れ", "破損", "割れ", "small", "小さい", "薄い", "チープ", "使いにくい", "説明書",
  "returned", "返品", "初期不良", "不具合", "汚れ", "剥がれ", "ぐらつ", "対応が悪",
];

interface Parsed {
  star: number | null;
  text: string;
}

function parseLine(line: string): Parsed {
  const t = line.trim();
  let star: number | null = null;
  const numMatch = t.match(/^([1-5])(?:\s*[\/／]\s*5|\s*点|\s*星|\s+)/);
  const blackStars = (t.match(/★/g) || []).length;
  if (numMatch) star = +numMatch[1];
  else if (blackStars >= 1 && blackStars <= 5) star = blackStars;
  return { star, text: t };
}

export default function ReviewAnalyzer() {
  const [raw, setRaw] = useState("");

  const r = useMemo(() => {
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map(parseLine);
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let withStar = 0;
    for (const p of parsed) if (p.star) { dist[p.star]++; withStar++; }
    const avg = withStar ? (1 * dist[1] + 2 * dist[2] + 3 * dist[3] + 4 * dist[4] + 5 * dist[5]) / withStar : 0;

    const joined = parsed.map((p) => p.text).join("\n");
    const count = (arr: string[]) =>
      arr
        .map((w) => ({ w, n: joined.split(w).length - 1 }))
        .filter((x) => x.n > 0)
        .sort((a, b) => b.n - a.n);
    const pos = count(POS);
    const neg = count(NEG);

    const lowReviews = parsed.filter((p) => p.star != null && p.star <= 2);
    return { total: lines.length, withStar, dist, avg, pos, neg, lowReviews };
  }, [raw]);

  const replies = {
    high:
      "この度はレビューをお寄せいただきありがとうございます。お気に召していただけたようで大変うれしく思います。" +
      "またお困りごとがございましたら、いつでもお気軽にご連絡ください。今後ともよろしくお願いいたします。",
    low:
      "このたびはご期待に沿えず、申し訳ございませんでした。いただいたご指摘は真摯に受け止め、" +
      "〔具体的な改善点〕について社内で改善を進めます。差し支えなければ、注文番号を添えてサポートまでご連絡いただけますでしょうか。" +
      "状況を確認のうえ、交換・返金を含めて対応させていただきます。",
    delay:
      "お届けにお時間をいただき、ご不便をおかけしました。配送状況の可視化と在庫連携の見直しを進めております。" +
      "今回の件、個別にお詫びとご案内をさせていただきたく、注文番号をお知らせいただけますと幸いです。",
    defect:
      "商品に不具合があったとのこと、誠に申し訳ございません。良品との交換、または返金にて対応いたします。" +
      "お手数ですが、症状がわかる写真と注文番号をサポート宛にお送りください。返送料は当店で負担いたします。",
  };

  return (
    <ToolShell slug="review-analyzer">
      <Field label="レビュー（1行1件。先頭に「5」や「★★★★☆」があれば星として集計）">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={8}
          placeholder={"5 梱包も丁寧で発送も早かったです。リピートします。\n2 思ったより小さい。説明書が不親切で使いにくい。"}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>

      {r.total > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="件数" value={`${r.total}`} />
            <Stat label="平均★" value={r.withStar ? r.avg.toFixed(2) : "—"} tone={r.avg >= 4 ? "ok" : r.avg >= 3 ? "warn" : "bad"} />
            <Stat label="低評価(★1-2)" value={`${r.lowReviews.length}`} tone={r.lowReviews.length ? "warn" : "ok"} />
            <Stat label="星あり" value={`${r.withStar}/${r.total}`} />
          </div>

          {r.withStar > 0 && (
            <div className="card p-4">
              {[5, 4, 3, 2, 1].map((s) => {
                const n = r.dist[s];
                const w = r.withStar ? (n / r.withStar) * 100 : 0;
                return (
                  <div key={s} className="mb-1 flex items-center gap-2 text-xs">
                    <span className="w-8">★{s}</span>
                    <div className="h-3 flex-1 overflow-hidden rounded bg-[var(--surface-soft)]">
                      <div className="h-full" style={{ width: `${w}%`, background: s >= 4 ? "#1a8a5a" : s === 3 ? "#a1701c" : "#bf0000" }} />
                    </div>
                    <span className="w-10 text-right">{n}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <WordBox title="好評ワード" items={r.pos} color="#1a8a5a" />
            <WordBox title="不満ワード" items={r.neg} color="#bf0000" />
          </div>
        </>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold">返信テンプレ（〔〕は具体化して使用）</p>
        <CopyBox title="高評価への返信" text={replies.high} rows={4} />
        <CopyBox title="低評価・クレームへの返信" text={replies.low} rows={5} />
        <CopyBox title="配送遅延への返信" text={replies.delay} rows={4} />
        <CopyBox title="不良品への返信" text={replies.defect} rows={4} />
        <p className="text-xs text-[var(--muted)]">
          NG回答チェック：①定型文だけで終えない（具体的な改善点・対応を書く）②責任回避の表現を避ける
          ③効果・効能を断定しない（薬機法）④公開返信で個人情報や取引条件を細かく書かない。
        </p>
      </div>

      <button
        onClick={() => recordHistory("review-analyzer", `${r.total}件を分析 平均★${r.avg.toFixed(2)}`, `不満ワード上位: ${r.neg.slice(0, 3).map((x) => x.w).join(", ")}`)}
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}

function WordBox({ title, items, color }: { title: string; items: { w: string; n: number }[]; color: string }) {
  return (
    <div className="card p-3">
      <div className="mb-2 text-sm font-semibold" style={{ color }}>
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">該当なし</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 15).map((x) => (
            <span key={x.w} className="rounded border px-2 py-0.5 text-xs">
              {x.w} <span className="text-[var(--muted)]">{x.n}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
