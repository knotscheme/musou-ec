"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

interface Judged {
  label: string;
  points: number;
  max: number;
  comment: string;
}

export default function AmazonListingAudit() {
  const [titleLen, setTitleLen] = useState(42);
  const [bullets, setBullets] = useState(5);
  const [images, setImages] = useState(4);
  const [hasVideo, setHasVideo] = useState(false);
  const [kwBytes, setKwBytes] = useState(180);
  const [hasAplus, setHasAplus] = useState(false);
  const [hasBrandStore, setHasBrandStore] = useState(false);
  const [reviews, setReviews] = useState(12);
  const [rating, setRating] = useState(4.3);

  const judged = useMemo<Judged[]>(() => {
    const list: Judged[] = [];
    list.push({
      label: "タイトル文字数",
      max: 15,
      points: titleLen >= 30 && titleLen <= 128 ? 15 : titleLen >= 20 && titleLen <= 180 ? 9 : 3,
      comment:
        titleLen < 20
          ? "短すぎ。ブランド＋主要語＋規格を30字前後で。"
          : titleLen > 180
            ? "長すぎ。冗長・記号の乱用は逆効果。"
            : "適正範囲。重複語を避け読みやすさを維持。",
    });
    list.push({
      label: "箇条書き（特徴）数",
      max: 15,
      points: bullets >= 5 ? 15 : bullets >= 3 ? 9 : 3,
      comment: bullets >= 5 ? "5点を活用できている。" : "5点まで埋める。ベネフィット→仕様の順で。",
    });
    list.push({
      label: "商品画像枚数",
      max: 20,
      points: images >= 7 ? 20 : images >= 5 ? 14 : images >= 3 ? 8 : 2,
      comment:
        images >= 7
          ? "十分。用途・サイズ比較・同梱物を網羅。"
          : "メイン白背景＋利用シーン＋サイズ＋同梱物で7枚以上に。",
    });
    list.push({
      label: "商品紹介動画",
      max: 8,
      points: hasVideo ? 8 : 0,
      comment: hasVideo ? "動画あり。" : "動画は滞在時間とCVRに寄与。短尺でも設置を。",
    });
    list.push({
      label: "検索キーワード（バックエンド）",
      max: 14,
      points: kwBytes === 0 ? 0 : kwBytes <= 250 ? 14 : 6,
      comment:
        kwBytes === 0
          ? "未設定。250バイトを使い切る。"
          : kwBytes > 250
            ? "250バイト超過分は索引されない。"
            : "適正。重複・商品名の再掲を避ける。",
    });
    list.push({
      label: "A+コンテンツ",
      max: 12,
      points: hasAplus ? 12 : 0,
      comment: hasAplus ? "設定済み。" : "A+は転換率向上に有効。ブランド登録で無料利用可。",
    });
    list.push({
      label: "ブランドストア",
      max: 6,
      points: hasBrandStore ? 6 : 0,
      comment: hasBrandStore ? "あり。" : "回遊とブランド想起に有効。広告の遷移先にも使える。",
    });
    list.push({
      label: "レビュー数・評価",
      max: 10,
      points: reviews >= 50 && rating >= 4 ? 10 : reviews >= 10 && rating >= 3.8 ? 6 : 2,
      comment:
        rating < 3.8
          ? "低評価レビューの内容を分析し商品/表現を改善。"
          : reviews < 10
            ? "レビュー依頼（規約準拠）で初期レビューを増やす。"
            : "良好。定期的に内容をモニタリング。",
    });
    return list;
  }, [titleLen, bullets, images, hasVideo, kwBytes, hasAplus, hasBrandStore, reviews, rating]);

  const score = judged.reduce((s, j) => s + j.points, 0);
  const tone = score >= 80 ? "ok" : score >= 55 ? "warn" : "bad";

  return (
    <ToolShell slug="amazon-listing-audit">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="タイトル文字数">
          <NumberInput value={titleLen} onChange={(e) => setTitleLen(+e.target.value)} />
        </Field>
        <Field label="箇条書き（特徴）数">
          <NumberInput value={bullets} onChange={(e) => setBullets(+e.target.value)} />
        </Field>
        <Field label="商品画像枚数">
          <NumberInput value={images} onChange={(e) => setImages(+e.target.value)} />
        </Field>
        <Field label="検索キーワード バイト数">
          <NumberInput value={kwBytes} onChange={(e) => setKwBytes(+e.target.value)} />
        </Field>
        <Field label="レビュー数">
          <NumberInput value={reviews} onChange={(e) => setReviews(+e.target.value)} />
        </Field>
        <Field label="平均★">
          <NumberInput value={rating} step={0.1} onChange={(e) => setRating(+e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={hasVideo} onChange={(e) => setHasVideo(e.target.checked)} />
          商品紹介動画あり
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={hasAplus} onChange={(e) => setHasAplus(e.target.checked)} />
          A+コンテンツあり
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={hasBrandStore}
            onChange={(e) => setHasBrandStore(e.target.checked)}
          />
          ブランドストアあり
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="総合スコア" value={`${score} / 100`} tone={tone} />
        <Stat label="判定" value={score >= 80 ? "良好" : score >= 55 ? "要改善" : "要対策"} tone={tone} />
        <Stat
          label="改善余地"
          value={`+${100 - score}pt`}
        />
      </div>

      <div className="space-y-2">
        {judged.map((j) => (
          <div key={j.label} className="card flex items-start gap-3 p-3 text-sm">
            <span
              className="mt-0.5 w-14 shrink-0 text-right font-bold"
              style={{ color: j.points === j.max ? "#1a8a5a" : j.points === 0 ? "#bf0000" : "#a1701c" }}
            >
              {j.points}/{j.max}
            </span>
            <div>
              <div className="font-medium">{j.label}</div>
              <div className="text-[var(--muted)]">{j.comment}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => recordHistory("amazon-listing-audit", `スコア ${score}/100`, `${judged.filter((j) => j.points < j.max).length}項目に改善余地`)}
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
