"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, TextInput, Stat } from "@/components/ToolShell";
import { recordHistory } from "@/lib/history";

type Rank = "good" | "ni" | "poor";
const rankLabel: Record<Rank, string> = { good: "良好", ni: "要改善", poor: "不良" };
const rankTone: Record<Rank, "ok" | "warn" | "bad"> = { good: "ok", ni: "warn", poor: "bad" };
const PSI_KEY_STORE = "musou.psiKey";

function judge(v: number, good: number, poor: number): Rank {
  return v <= good ? "good" : v <= poor ? "ni" : "poor";
}

const ADVICE: Record<string, string[]> = {
  lcp: [
    "ヒーロー画像を WebP/AVIF・適切な寸法で配信し、preload する",
    "テーマの不要なアプリ埋め込み（レビュー/チャット等）を削減・遅延読み込み",
    "フォントは woff2・font-display: swap、先頭で preconnect",
  ],
  cls: [
    "画像・iframe・広告枠に width/height（またはアスペクト比）を指定",
    "Web フォントの入れ替えによるレイアウトシフトを抑制",
    "動的に挿入されるバナー/クーポン枠の高さを予約",
  ],
  inp: [
    "サードパーティ製アプリの JS を削減（特に計測・チャット・レコメンド）",
    "重いイベントハンドラを分割し、メインスレッドの長タスクを避ける",
    "画像ギャラリー等は必要になるまで初期化を遅延",
  ],
};

interface PsiParsed {
  scoreLab: number | null;
  source: "field" | "lab";
  lcp: number;
  cls: number;
  inp: number;
  fcp?: number;
  tbt?: number;
}

async function runPsi(url: string, strategy: "mobile" | "desktop", key: string): Promise<PsiParsed> {
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url);
  api.searchParams.set("strategy", strategy);
  api.searchParams.append("category", "performance");
  if (key) api.searchParams.set("key", key);
  const res = await fetch(api.toString());
  if (!res.ok) {
    let msg = `PageSpeed API エラー (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error?.message) msg += `: ${j.error.message}`;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  const j = await res.json();
  const lh = j.lighthouseResult;
  const scoreLab = lh?.categories?.performance?.score != null ? Math.round(lh.categories.performance.score * 100) : null;
  const audit = (id: string) => lh?.audits?.[id]?.numericValue;

  const field = j.loadingExperience?.metrics || j.originLoadingExperience?.metrics;
  if (field?.LARGEST_CONTENTFUL_PAINT_MS && field?.CUMULATIVE_LAYOUT_SHIFT_SCORE) {
    return {
      scoreLab,
      source: "field",
      lcp: field.LARGEST_CONTENTFUL_PAINT_MS.percentile / 1000,
      cls: field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100,
      inp: (field.INTERACTION_TO_NEXT_PAINT?.percentile ?? field.EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT?.percentile ?? 0),
    };
  }
  return {
    scoreLab,
    source: "lab",
    lcp: (audit("largest-contentful-paint") ?? 0) / 1000,
    cls: audit("cumulative-layout-shift") ?? 0,
    inp: audit("interaction-to-next-paint") ?? audit("experimental-interaction-to-next-paint") ?? audit("total-blocking-time") ?? 0,
    fcp: (audit("first-contentful-paint") ?? 0) / 1000,
    tbt: audit("total-blocking-time") ?? 0,
  };
}

export default function SiteSpeed() {
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [psiKey, setPsiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [meta, setMeta] = useState<{ source: string; scoreLab: number | null } | null>(null);

  const [lcp, setLcp] = useState(3.4);
  const [cls, setCls] = useState(0.18);
  const [inp, setInp] = useState(320);

  useEffect(() => {
    try {
      setPsiKey(localStorage.getItem(PSI_KEY_STORE) || "");
    } catch { /* ignore */ }
  }, []);

  function saveKey(v: string) {
    setPsiKey(v);
    try {
      if (v) localStorage.setItem(PSI_KEY_STORE, v.trim());
      else localStorage.removeItem(PSI_KEY_STORE);
    } catch { /* ignore */ }
  }

  async function measure() {
    setErr("");
    let target = url.trim();
    if (!target) {
      setErr("URLを入力してください。");
      return;
    }
    if (!/^https?:\/\//i.test(target)) target = "https://" + target;
    setBusy(true);
    try {
      const p = await runPsi(target, strategy, psiKey);
      setLcp(Number(p.lcp.toFixed(2)));
      setCls(Number(p.cls.toFixed(3)));
      setInp(Math.round(p.inp));
      setMeta({ source: p.source, scoreLab: p.scoreLab });
      recordHistory(
        "site-speed",
        `${target}（${strategy} / ${p.source === "field" ? "実ユーザー" : "ラボ"}）`,
        `LCP ${p.lcp.toFixed(1)}s / CLS ${p.cls.toFixed(2)} / INP ${Math.round(p.inp)}ms${p.scoreLab != null ? ` / スコア${p.scoreLab}` : ""}`,
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const r = useMemo(() => {
    const rl = judge(lcp, 2.5, 4.0);
    const rc = judge(cls, 0.1, 0.25);
    const ri = judge(inp, 200, 500);
    const order = { poor: 0, ni: 1, good: 2 };
    const worst = [
      { k: "lcp", rank: rl, name: "LCP" },
      { k: "cls", rank: rc, name: "CLS" },
      { k: "inp", rank: ri, name: "INP" },
    ].sort((a, b) => order[a.rank] - order[b.rank]);
    return { rl, rc, ri, worst, pass: rl === "good" && rc === "good" && ri === "good" };
  }, [lcp, cls, inp]);

  return (
    <ToolShell slug="site-speed">
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">URLで自動計測（PageSpeed Insights）</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/products/xxx" />
          <select value={strategy} onChange={(e) => setStrategy(e.target.value as "mobile" | "desktop")} className="rounded-md border px-3 py-2 text-sm">
            <option value="mobile">モバイル</option>
            <option value="desktop">デスクトップ</option>
          </select>
          <button onClick={measure} disabled={busy} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "計測中…" : "計測"}
          </button>
        </div>
        {err && <p className="mt-2 text-sm" style={{ color: "#bf0000" }}>⚠ {err}</p>}
        {meta && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            データ元：{meta.source === "field" ? "実ユーザー（CrUX・直近28日）" : "ラボ（Lighthouse 1回計測）"}
            {meta.scoreLab != null && ` ／ Lighthouseパフォーマンススコア ${meta.scoreLab}`}
          </p>
        )}
        <details className="mt-2 text-xs text-[var(--muted)]">
          <summary className="cursor-pointer">APIキー（任意・キーなしでも低頻度なら動作）</summary>
          <div className="mt-2 flex items-center gap-2">
            <TextInput value={psiKey} onChange={(e) => saveKey(e.target.value)} placeholder="PageSpeed Insights API キー" />
          </div>
          <p className="mt-1">
            大量に計測する場合は Google Cloud で「PageSpeed Insights API」を有効化してキーを取得すると制限が緩みます。キーはこのブラウザにのみ保存されます。
          </p>
        </details>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="LCP（秒）" hint="良好 ≤2.5 / 不良 >4.0">
          <NumberInput value={lcp} step={0.1} onChange={(e) => setLcp(+e.target.value)} />
        </Field>
        <Field label="CLS" hint="良好 ≤0.1 / 不良 >0.25">
          <NumberInput value={cls} step={0.01} onChange={(e) => setCls(+e.target.value)} />
        </Field>
        <Field label="INP（ms）" hint="良好 ≤200 / 不良 >500">
          <NumberInput value={inp} step={10} onChange={(e) => setInp(+e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={`LCP ${lcp}s`} value={rankLabel[r.rl]} tone={rankTone[r.rl]} />
        <Stat label={`CLS ${cls}`} value={rankLabel[r.rc]} tone={rankTone[r.rc]} />
        <Stat label={`INP ${inp}ms`} value={rankLabel[r.ri]} tone={rankTone[r.ri]} />
      </div>

      <div className="card p-4 text-sm">
        {r.pass ? (
          <p style={{ color: "#1a8a5a" }}>3指標すべて「良好」。Core Web Vitals は合格圏です。</p>
        ) : (
          <>
            <p className="font-semibold">改善の優先順位（悪い指標から）</p>
            <ol className="mt-2 space-y-3">
              {r.worst
                .filter((w) => w.rank !== "good")
                .map((w) => (
                  <li key={w.k}>
                    <div className="font-medium">
                      {w.name}（{rankLabel[w.rank]}）
                    </div>
                    <ul className="mt-1 list-disc pl-5 text-[var(--muted)]">
                      {ADVICE[w.k].map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ol>
          </>
        )}
      </div>
    </ToolShell>
  );
}
