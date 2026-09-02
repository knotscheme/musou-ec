"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, TextInput, Stat } from "@/components/ToolShell";
import { tokenize } from "@/lib/text";
import { recordHistory } from "@/lib/history";

interface Check {
  label: string;
  points: number;
  max: number;
  comment: string;
}

export default function YahooNameSeo() {
  const [name, setName] = useState("");
  const [mainKw, setMainKw] = useState("");
  const [category, setCategory] = useState("");

  const r = useMemo(() => {
    const len = [...name].length;
    const words = tokenize(name);
    const kw = mainKw.trim();
    const headHasKw = kw ? name.slice(0, Math.max(kw.length + 6, 12)).includes(kw) : false;
    const kwCount = kw ? name.split(kw).length - 1 : 0;
    const symbolMatches = name.match(/[!！★☆【】≪≫『』\/／|｜"”“'’＆&#※\-—~〜]/g) ?? [];
    const dup = new Map<string, number>();
    for (const w of words) dup.set(w, (dup.get(w) ?? 0) + 1);
    const dupWords = [...dup.entries()].filter(([, n]) => n >= 2).map(([w]) => w);
    const catWords = tokenize(category);
    const catInName = catWords.filter((w) => name.includes(w));

    const checks: Check[] = [];
    checks.push({
      label: "先頭にメインキーワード",
      max: 30,
      points: !kw ? 0 : headHasKw ? 30 : 8,
      comment: !kw
        ? "メインKWを入力してください。"
        : headHasKw
          ? "先頭付近にKWがあり良好。"
          : "Yahooは先頭のKWが最重要。商品名の頭にメインKWを移動。",
    });
    checks.push({
      label: "文字数",
      max: 20,
      points: len >= 20 && len <= 75 ? 20 : len < 20 ? 8 : 12,
      comment:
        len < 20
          ? "短すぎ。用途・型番・サイズ・色などの検索語を追加（〜75文字目安）。"
          : len > 75
            ? "長すぎ。冗長・重複を削り読みやすく。"
            : "適正範囲。",
    });
    checks.push({
      label: "キーワードの重複",
      max: 15,
      points: dupWords.length === 0 ? 15 : dupWords.length <= 2 ? 8 : 2,
      comment: dupWords.length
        ? `重複語: ${dupWords.join(", ")}。同義語や別の検索語に置き換える。`
        : "重複なし。",
    });
    checks.push({
      label: "記号の使いすぎ",
      max: 15,
      points: symbolMatches.length <= 2 ? 15 : symbolMatches.length <= 5 ? 8 : 2,
      comment:
        symbolMatches.length > 5
          ? `記号が ${symbolMatches.length} 個。過剰な装飾はスパム判定・可読性低下のリスク。`
          : "記号は許容範囲。",
    });
    checks.push({
      label: "カテゴリ整合",
      max: 10,
      points: !category ? 5 : catInName.length ? 10 : 3,
      comment: !category
        ? "カテゴリ名を入れると整合をチェックできます。"
        : catInName.length
          ? "カテゴリを表す語が商品名に含まれている。"
          : "カテゴリを表す語が商品名にない。カテゴリ名の主要語を1つ含める。",
    });
    checks.push({
      label: "KWの詰め込みすぎでない",
      max: 10,
      points: kwCount <= 2 ? 10 : kwCount === 3 ? 5 : 1,
      comment: kwCount > 3 ? `メインKWが ${kwCount} 回。2回程度に抑える。` : "適正。",
    });

    const score = checks.reduce((s, c) => s + c.points, 0);
    return { len, score, checks, symbolMatches: symbolMatches.length, dupWords };
  }, [name, mainKw, category]);

  const tone = r.score >= 80 ? "ok" : r.score >= 55 ? "warn" : "bad";

  return (
    <ToolShell slug="yahoo-name-seo">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="メインキーワード">
          <TextInput value={mainKw} onChange={(e) => setMainKw(e.target.value)} placeholder="例）キャンプ チェア" />
        </Field>
        <Field label="カテゴリ名（任意）">
          <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="例）アウトドアチェア" />
        </Field>
      </div>
      <Field label="商品名" hint="Yahooの検索は商品名が最重要。先頭のKWが効く">
        <textarea
          value={name}
          onChange={(e) => setName(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="スコア" value={`${r.score} / 100`} tone={tone} />
        <Stat label="文字数" value={`${r.len}`} tone={r.len > 75 ? "warn" : "ok"} />
        <Stat label="記号数" value={`${r.symbolMatches}`} tone={r.symbolMatches > 5 ? "bad" : "ok"} />
      </div>

      <div className="space-y-2">
        {r.checks.map((c) => (
          <div key={c.label} className="card flex items-start gap-3 p-3 text-sm">
            <span
              className="mt-0.5 w-14 shrink-0 text-right font-bold"
              style={{ color: c.points === c.max ? "#1a8a5a" : c.points === 0 ? "#bf0000" : "#a1701c" }}
            >
              {c.points}/{c.max}
            </span>
            <div>
              <div className="font-medium">{c.label}</div>
              <div className="text-[var(--muted)]">{c.comment}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => recordHistory("yahoo-name-seo", `商品名スコア ${r.score}/100`, name.slice(0, 40))}
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
