"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

export default function RakutenGenreKeyword() {
  const [kw, setKw] = useState(""); // 対策キーワード（改行 or カンマ区切り）
  const [name, setName] = useState("");
  const [copy, setCopy] = useState(""); // キャッチコピー
  const [desc, setDesc] = useState(""); // PC用商品説明

  const r = useMemo(() => {
    const kws = kw
      .split(/[\n,、]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const nameLen = [...name].length;
    const copyLen = [...copy].length;

    const rows = kws.map((k) => {
      const inNameAt = name.indexOf(k);
      const inName = inNameAt >= 0;
      const nameHead = inName && inNameAt <= 12;
      const inCopy = copy.includes(k);
      const descCount = k ? desc.split(k).length - 1 : 0;
      let score = 0;
      if (nameHead) score += 3;
      else if (inName) score += 2;
      if (inCopy) score += 1;
      if (descCount >= 1) score += 1;
      if (descCount >= 3) score += 1;
      return { k, inName, nameHead, inCopy, descCount, score, max: 6 };
    });

    const total = rows.reduce((s, x) => s + x.score, 0);
    const maxTotal = rows.length * 6 || 1;
    const pct = Math.round((total / maxTotal) * 100);
    return { kws, rows, pct, nameLen, copyLen };
  }, [kw, name, copy, desc]);

  const tone = r.pct >= 80 ? "ok" : r.pct >= 50 ? "warn" : "bad";

  return (
    <ToolShell slug="rakuten-genre-keyword">
      <Field label="対策キーワード" hint="改行またはカンマ区切りで複数可">
        <textarea
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="キャンプ チェア&#10;アウトドア 椅子 軽量"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`商品名（${r.nameLen}文字）`}>
          <textarea value={name} onChange={(e) => setName(e.target.value)} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
        </Field>
        <Field label={`キャッチコピー（${r.copyLen}文字）`}>
          <textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
        </Field>
      </div>
      <Field label="PC用商品説明文">
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="w-full rounded-md border px-3 py-2 text-sm" />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="KW配置スコア" value={`${r.pct} / 100`} tone={tone} />
        <Stat label="対策KW数" value={`${r.kws.length}`} />
      </div>

      {r.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-[var(--muted)]">
                <th className="py-2 pr-3">キーワード</th>
                <th className="py-2 pr-3">商品名</th>
                <th className="py-2 pr-3">キャッチ</th>
                <th className="py-2 pr-3">説明文</th>
                <th className="py-2 pr-3">評価</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.k} className="border-b">
                  <td className="py-2 pr-3 font-medium">{x.k}</td>
                  <td className="py-2 pr-3">{x.nameHead ? "◎ 先頭" : x.inName ? "○ あり" : "— なし"}</td>
                  <td className="py-2 pr-3">{x.inCopy ? "○" : "—"}</td>
                  <td className="py-2 pr-3">{x.descCount > 0 ? `${x.descCount}回` : "—"}</td>
                  <td
                    className="py-2 pr-3 font-semibold"
                    style={{ color: x.score >= 5 ? "#1a8a5a" : x.score >= 3 ? "#a1701c" : "#bf0000" }}
                  >
                    {x.score}/6
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card p-4 text-sm text-[var(--muted)]">
        改善の型：<b>①商品名の先頭に主要KW</b> → ②キャッチコピーに主要KWを1回 → ③説明文に関連KWを2〜3回自然に配置。
        ジャンル選定は「対策KWで実際に検索 → 上位競合の登録ジャンル」に合わせるのが基本（ジャンルIDは楽天のジャンルガイドで確認）。
      </div>

      <button
        onClick={() => recordHistory("rakuten-genre-keyword", `配置スコア ${r.pct}/100`, `${r.kws.length}KW`)}
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}
