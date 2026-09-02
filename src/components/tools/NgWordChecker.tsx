"use client";

import { useMemo, useState } from "react";
import { ToolShell, Stat } from "@/components/ToolShell";
import { scanNg, CATEGORY_COLOR, type NgCategory } from "@/lib/ngwords";
import { recordHistory } from "@/lib/history";

const SAMPLE =
  "この美容液を使えばシミが消える！血行促進で肌の細胞が活性化し、シワがなくなると評判です。日本一の実力、効果は絶対。今なら通常価格の半額セール。";

export default function NgWordChecker() {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);

  const hits = useMemo(() => (text ? scanNg(text) : []), [text]);

  const byCat = useMemo(() => {
    const m: Record<NgCategory, number> = { 薬機法: 0, 景表法: 0, 注意: 0 };
    for (const h of hits) m[h.entry.category]++;
    return m;
  }, [hits]);

  function run() {
    setChecked(true);
    if (text.trim()) {
      recordHistory(
        "ng-word-checker",
        `${hits.length}件の指摘`,
        `薬機法${byCat["薬機法"]} / 景表法${byCat["景表法"]} / 注意${byCat["注意"]}`,
      );
    }
  }

  // ハイライト描画
  const segments: React.ReactNode[] = [];
  let cursor = 0;
  hits.forEach((h, i) => {
    if (h.index > cursor) segments.push(<span key={`t${i}`}>{text.slice(cursor, h.index)}</span>);
    segments.push(
      <mark
        key={`m${i}`}
        className="rounded px-0.5"
        style={{
          background: `${CATEGORY_COLOR[h.entry.category]}22`,
          borderBottom: `2px solid ${CATEGORY_COLOR[h.entry.category]}`,
        }}
        title={`${h.entry.category}: ${h.entry.note}`}
      >
        {text.slice(h.index, h.index + h.length)}
      </mark>,
    );
    cursor = h.index + h.length;
  });
  if (cursor < text.length) segments.push(<span key="tail">{text.slice(cursor)}</span>);

  // ユニークな指摘一覧
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return hits.filter((h) => {
      if (seen.has(h.entry.word)) return false;
      seen.add(h.entry.word);
      return true;
    });
  }, [hits]);

  return (
    <ToolShell slug="ng-word-checker">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">チェックする文章</span>
          <button
            onClick={() => setText(SAMPLE)}
            className="text-xs text-[var(--brand)] underline"
          >
            サンプルを入れる
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setChecked(false);
          }}
          rows={6}
          placeholder="商品説明文・広告コピーを貼り付け"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={run}
            className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            チェック
          </button>
          <span className="text-xs text-[var(--muted)]">{text.length} 文字</span>
        </div>
      </div>

      {checked && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="指摘合計" value={`${hits.length}`} tone={hits.length ? "warn" : "ok"} />
            <Stat label="薬機法" value={`${byCat["薬機法"]}`} tone={byCat["薬機法"] ? "bad" : "ok"} />
            <Stat label="景表法" value={`${byCat["景表法"]}`} tone={byCat["景表法"] ? "warn" : "ok"} />
            <Stat label="注意" value={`${byCat["注意"]}`} />
          </div>

          <div className="card p-4 text-sm leading-relaxed">
            {hits.length ? segments : <span className="text-[var(--muted)]">一致なし。</span>}
          </div>

          {unique.length > 0 && (
            <div className="space-y-2">
              {unique.map((h) => (
                <div key={h.entry.word} className="card p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-white"
                      style={{ background: CATEGORY_COLOR[h.entry.category] }}
                    >
                      {h.entry.category}
                    </span>
                    <span className="font-bold">{h.entry.word}</span>
                  </div>
                  <p className="mt-1 text-[var(--muted)]">{h.entry.note}</p>
                  <p className="mt-0.5">→ {h.entry.suggest}</p>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-[var(--muted)]">
            ※ 一般的な目安です。法的助言ではありません。最終判断は各モール規約・消費者庁/厚労省の
            ガイドライン・専門家の確認を。
          </p>
        </>
      )}
    </ToolShell>
  );
}
