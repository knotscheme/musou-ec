"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { ExtensionNote } from "@/components/ExtensionNote";
import { downloadCSV } from "@/lib/csv";
import { toHankaku } from "@/lib/text";
import { recordHistory } from "@/lib/history";
import { useExtension, extRequest } from "@/lib/extension";

const GOJUON = "あかさたなはまやらわ".split("");
const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");

export default function RakutenSuggest() {
  const [seed, setSeed] = useState("キャンプ チェア");
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<"gojuon" | "alpha">("gojuon");
  const { ready: extReady } = useExtension();
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState("");
  const [probeOut, setProbeOut] = useState("");

  async function runProbe() {
    setProbeOut("診断中…");
    try {
      const r = await extRequest<{ results: unknown[] }>(
        { type: "rakutenSuggestProbe", seed: seed.trim() || "キャンプ" },
        60000,
      );
      setProbeOut(JSON.stringify(r?.results ?? r, null, 2));
    } catch (e) {
      setProbeOut(`診断エラー：${(e as Error).message}`);
    }
  }

  async function autoFetch() {
    if (!seed.trim()) return;
    setFetching(true);
    setFetchMsg("拡張で取得中…（キーワードにより30秒〜2分ほどかかります）");
    try {
      const r = await extRequest<{ keywords: string[]; tried?: number; debug?: string }>(
        { type: "rakutenSuggest", seed: seed.trim(), mode },
        180000,
      );
      const got = r?.keywords ?? [];
      if (!got.length) {
        setFetchMsg(
          `候補が取得できませんでした。手動貼り付けをご利用ください。${r?.debug ? `（詳細: ${r.debug}）` : ""}`,
        );
      } else {
        setRaw((prev) => [prev, ...got].filter(Boolean).join("\n"));
        setFetchMsg(
          `${got.length} 件を取得しました${r?.tried ? `（${r.tried} 通りを照会）` : ""}。ニッチな語ほど候補は少なめです。`,
        );
      }
    } catch (e) {
      setFetchMsg(`取得エラー：${(e as Error).message}`);
    } finally {
      setFetching(false);
    }
  }

  const probes = useMemo(() => {
    const s = seed.trim();
    if (!s) return [];
    const suffixes = mode === "gojuon" ? GOJUON : ALPHA;
    return [s, ...suffixes.map((x) => `${s} ${x}`)];
  }, [seed, mode]);

  const cleaned = useMemo(() => {
    const set = new Set<string>();
    for (const line of raw.split(/\r?\n/)) {
      const t = toHankaku(line.trim()).replace(/\s+/g, " ");
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ja"));
  }, [raw]);

  const grouped = useMemo(() => {
    const g = new Map<string, string[]>();
    for (const k of cleaned) {
      const head = k.split(/\s+/)[0] || "その他";
      g.set(head, [...(g.get(head) ?? []), k]);
    }
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [cleaned]);

  function exportCsv() {
    downloadCSV("rakuten-suggest", [["キーワード", "文字数", "語数"], ...cleaned.map((k) => [k, k.length, k.split(/\s+/).length])]);
    recordHistory("rakuten-suggest", `${cleaned.length}件のサジェスト整形`, seed);
  }

  return (
    <ToolShell slug="rakuten-suggest">
      {extReady ? (
        <div className="card border-[var(--brand)] p-4 text-sm">
          <p className="font-semibold text-[var(--brand)]">⧉ MUSOU-EC コネクタ 接続中</p>
          <p className="mt-1 text-[var(--muted)]">
            シード語と展開方法を選んで「拡張で自動取得」を押すと、あなたのブラウザから楽天サジェストを深掘りして下の欄に入れます。
          </p>
        </div>
      ) : (
        <ExtensionNote
          auto="シードワードを登録すると、拡張があなたのブラウザから楽天のサジェストを深掘り取得します。"
          manual="下のリンクから楽天検索を開き、検索窓に出るサジェスト候補をコピーして貼り付け → 整形・重複除去・CSV化します。拡張は apps/extension を「パッケージ化されていない拡張機能」として読み込むと有効になります。"
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="シードキーワード">
          <TextInput value={seed} onChange={(e) => setSeed(e.target.value)} />
        </Field>
        <Field label="展開方法">
          <select value={mode} onChange={(e) => setMode(e.target.value as "gojuon" | "alpha")} className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="gojuon">五十音（あ〜ん）</option>
            <option value="alpha">アルファベット（a〜z）</option>
          </select>
        </Field>
        {extReady && (
          <Field label="自動取得">
            <button
              onClick={autoFetch}
              disabled={fetching}
              className="w-full rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {fetching ? "取得中…" : "拡張で自動取得"}
            </button>
          </Field>
        )}
      </div>
      {fetchMsg && <p className="text-sm text-[var(--muted)]">{fetchMsg}</p>}
      {extReady && (
        <div className="space-y-1">
          <button onClick={runProbe} className="text-xs text-[var(--muted)] underline">
            接続診断（うまく取れない時）
          </button>
          {probeOut && (
            <pre className="max-h-72 overflow-auto rounded bg-[var(--surface-soft)] p-2 text-[11px] leading-tight">
              {probeOut}
            </pre>
          )}
        </div>
      )}

      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">手動収集リンク（開いてサジェストをコピー）</p>
        <div className="flex flex-wrap gap-1.5">
          {probes.map((p) => (
            <a
              key={p}
              href={`https://search.rakuten.co.jp/search/mall/${encodeURIComponent(p)}/`}
              target="_blank"
              rel="noreferrer"
              className="rounded border px-2 py-0.5 text-xs text-[var(--brand)] hover:bg-[var(--surface-soft)]"
            >
              {p}
            </a>
          ))}
        </div>
      </div>

      <Field label="収集したサジェストを貼り付け（1行1件）">
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>

      {cleaned.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">整形後 {cleaned.length} 件（重複除去・半角化・ソート済み）</p>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(cleaned.join("\n"))} className="rounded-md border px-3 py-1.5 text-sm font-semibold">
                コピー
              </button>
              <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white">
                CSV
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {grouped.map(([head, items]) => (
              <div key={head} className="card p-3">
                <div className="mb-1 text-xs font-semibold text-[var(--muted)]">{head}（{items.length}）</div>
                <div className="flex flex-wrap gap-1">
                  {items.map((k) => (
                    <span key={k} className="rounded bg-[var(--surface-soft)] px-2 py-0.5 text-xs">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ToolShell>
  );
}
