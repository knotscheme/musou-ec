"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell, Field, TextInput, Stat } from "@/components/ToolShell";
import { ExtensionNote } from "@/components/ExtensionNote";
import { idbGet, idbPut } from "@/lib/idb";
import { getOwnerId } from "@/lib/guest";
import { downloadCSV } from "@/lib/csv";
import { useExtension, extRequest } from "@/lib/extension";
import { DownloadButton } from "@/components/DownloadButton";

interface Entry {
  id: string;
  owner: string;
  keyword: string;
  target: string;
  rank: number;
  date: string;
  note: string;
}

const STORE_KEY = "ranktracker";

async function loadAll(): Promise<Entry[]> {
  const row = await idbGet<{ key: string; value: Entry[] }>("kv", STORE_KEY).catch(() => undefined);
  return row?.value ?? [];
}
async function saveAll(list: Entry[]) {
  await idbPut("kv", { key: STORE_KEY, value: list }).catch(() => {});
}

export default function RankTracker() {
  const [all, setAll] = useState<Entry[]>([]);
  const [kw, setKw] = useState("");
  const [target, setTarget] = useState("");
  const [rank, setRank] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const { ready: extReady } = useExtension();
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState("");
  const [pages, setPages] = useState(3);
  const [bulk, setBulk] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  const owner = typeof window !== "undefined" ? getOwnerId() : "";

  async function checkRank() {
    if (!kw.trim() || !target.trim()) {
      setCheckMsg("キーワードと対象（商品URL/コード）を入力してください。");
      return;
    }
    setChecking(true);
    setCheckMsg(`拡張で楽天検索を確認中…（上位約${pages * 45}位まで）`);
    try {
      const r = await extRequest<{ rank: number; page?: number; checked?: number; error?: string }>(
        { type: "rakutenRank", keyword: kw.trim(), target: target.trim(), pages },
        90000,
      );
      if (r?.rank) {
        setRank(String(r.rank));
        setCheckMsg(`${r.rank} 位（${r.page}ページ目 / ${r.checked} 件を確認）。「記録を追加」で保存できます。`);
      } else {
        setCheckMsg(r?.error || "見つかりませんでした。");
      }
    } catch (e) {
      setCheckMsg(`取得エラー：${(e as Error).message}`);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    loadAll().then(setAll);
  }, []);

  const mine = useMemo(() => all.filter((e) => e.owner === owner), [all, owner]);

  const byKeyword = useMemo(() => {
    const g = new Map<string, Entry[]>();
    for (const e of mine) g.set(e.keyword, [...(g.get(e.keyword) ?? []), e]);
    return [...g.entries()].map(([k, list]) => {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      const first = sorted[0];
      return {
        keyword: k,
        list: sorted,
        latest: latest.rank,
        best: Math.min(...sorted.map((x) => x.rank)),
        worst: Math.max(...sorted.map((x) => x.rank)),
        delta: sorted.length > 1 ? latest.rank - first.rank : 0,
      };
    });
  }, [mine]);

  async function add() {
    const r = parseInt(rank, 10);
    if (!kw.trim() || !r) return;
    const e: Entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      owner,
      keyword: kw.trim(),
      target: target.trim(),
      rank: r,
      date,
      note: note.trim(),
    };
    const next = [...all, e];
    setAll(next);
    await saveAll(next);
    setRank("");
    setNote("");
  }

  async function runBulk() {
    const lines = bulk
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    // ヘッダー行らしきものを除去
    if (lines[0] && /キーワード/.test(lines[0]) && /(url|コード)/i.test(lines[0])) lines.shift();
    const pairs = lines
      .map((l) => l.split(/[\t,]/).map((s) => s.trim()))
      .map(([keyword, tgt]) => ({ keyword: keyword || "", target: tgt || "" }))
      .filter((p) => p.keyword && p.target);
    if (!pairs.length) {
      setBulkMsg("「キーワード , 商品URL（またはコード）」を1行ずつ入力してください。");
      return;
    }
    setBulkBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    const added: Entry[] = [];
    let notFound = 0;
    for (let i = 0; i < pairs.length; i++) {
      setBulkMsg(`${i + 1}/${pairs.length}：「${pairs[i].keyword}」を確認中…`);
      try {
        const r = await extRequest<{ rank: number; error?: string }>(
          { type: "rakutenRank", keyword: pairs[i].keyword, target: pairs[i].target, pages },
          90000,
        );
        if (r?.rank) {
          added.push({
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            owner,
            keyword: pairs[i].keyword,
            target: pairs[i].target,
            rank: r.rank,
            date: today,
            note: "",
          });
        } else {
          notFound++;
        }
      } catch {
        notFound++;
      }
      await new Promise((res) => setTimeout(res, 200));
    }
    if (added.length) {
      const next = [...all, ...added];
      setAll(next);
      await saveAll(next);
    }
    setBulkBusy(false);
    setBulkMsg(`完了：${added.length} 件を記録${notFound ? `（${notFound} 件は圏外/未検出）` : ""}。下の「CSVダウンロード」で一括出力できます。`);
  }

  async function remove(id: string) {
    const next = all.filter((e) => e.id !== id);
    setAll(next);
    await saveAll(next);
  }

  function exportCsv() {
    downloadCSV("rank-tracker", [
      ["日付", "キーワード", "対象", "順位", "メモ"],
      ...mine.sort((a, b) => a.date.localeCompare(b.date) || a.keyword.localeCompare(b.keyword)).map((e) => [e.date, e.keyword, e.target, e.rank, e.note]),
    ]);
  }

  return (
    <ToolShell slug="rank-tracker">
      <ExtensionNote
        connected={extReady}
        auto="キーワードと対象商品（商品URL/コード）を入れて「拡張で順位を取得」を押すと、あなたのブラウザから楽天検索を走査し順位を自動入力します。「記録を追加」で推移を保存。"
        manual="検索して見つけた順位を手入力で記録します。推移・ベスト/ワースト・増減を自動集計します（記録はこの端末に保存）。"
      />

      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">順位を記録</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <Field label="キーワード"><TextInput value={kw} onChange={(e) => setKw(e.target.value)} /></Field>
          <Field label="対象（商品番号/URL）"><TextInput value={target} onChange={(e) => setTarget(e.target.value)} /></Field>
          <Field label="順位"><TextInput type="number" value={rank} onChange={(e) => setRank(e.target.value)} /></Field>
          <Field label="日付"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" /></Field>
          <Field label="メモ"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={add} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
            記録を追加
          </button>
          {extReady && (
            <>
              <button
                onClick={checkRank}
                disabled={checking}
                className="rounded-md border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] disabled:opacity-50"
              >
                {checking ? "確認中…" : "拡張で順位を取得"}
              </button>
              <label className="text-xs text-[var(--muted)]">
                走査ページ数{" "}
                <select
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  className="rounded border px-1.5 py-1 text-xs"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}（約{n * 45}位）
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        {checkMsg && <p className="mt-1.5 text-xs text-[var(--muted)]">{checkMsg}</p>}
      </div>

      {extReady && (
        <div className="card p-4">
          <p className="mb-1 text-sm font-semibold">一括で順位取得（1行 = キーワード , 商品URL/コード）</p>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={5}
            placeholder={"本革ベルト, https://item.rakuten.co.jp/shop/xxxx/\nメンズ 財布, shop/yyyy\nレザー キーケース, https://item.rakuten.co.jp/shop/zzzz/"}
            className="w-full rounded-md border px-3 py-2 font-mono text-xs"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={runBulk}
              disabled={bulkBusy || !bulk.trim()}
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {bulkBusy ? "取得中…" : "一括で順位を取得して記録"}
            </button>
            <label className="cursor-pointer rounded-md border px-3 py-2 text-sm font-semibold">
              CSV/テキストを読み込む
              <input
                type="file"
                accept=".csv,.txt,text/plain,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const t = await f.text();
                  setBulk(
                    t
                      .split(/\r?\n/)
                      .filter((l) => l.trim())
                      .join("\n"),
                  );
                  e.target.value = "";
                }}
              />
            </label>
            <DownloadButton
              onDownload={() =>
                downloadCSV("rank-tracker-template", [
                  ["キーワード", "商品URLまたはコード"],
                  ["本革ベルト", "https://item.rakuten.co.jp/yourshop/lb076/"],
                  ["メンズ 財布", "yourshop/bt101"],
                ])
              }
            >
              テンプレDL
            </DownloadButton>
            <span className="text-xs text-[var(--muted)]">今日の日付で記録。走査ページ数は上の設定を使用</span>
          </div>
          {bulkMsg && <p className="mt-1.5 text-xs text-[var(--muted)]">{bulkMsg}</p>}
        </div>
      )}

      {byKeyword.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="追跡キーワード" value={`${byKeyword.length}`} />
            <Stat label="記録数" value={`${mine.length}`} />
            <button onClick={exportCsv} className="card p-3 text-left text-sm font-semibold text-[var(--brand)]">
              CSVダウンロード →
            </button>
          </div>

          <div className="space-y-3">
            {byKeyword.map((g) => (
              <div key={g.keyword} className="card p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{g.keyword}</span>
                  <Spark list={g.list} />
                  <span className="text-sm">最新 <b>{g.latest}位</b></span>
                  <span className="text-xs text-[var(--muted)]">ベスト {g.best} / ワースト {g.worst}</span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: g.delta < 0 ? "#1a8a5a" : g.delta > 0 ? "#bf0000" : "var(--muted)" }}
                  >
                    {g.delta === 0 ? "変動なし" : g.delta < 0 ? `▲ ${-g.delta}上昇` : `▼ ${g.delta}下降`}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {g.list.map((e) => (
                    <span key={e.id} className="group inline-flex items-center gap-1 rounded border px-2 py-0.5">
                      {e.date.slice(5)}: {e.rank}位
                      <button onClick={() => remove(e.id)} className="text-[var(--muted)] opacity-0 group-hover:opacity-100">
                        ×
                      </button>
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

function Spark({ list }: { list: { rank: number }[] }) {
  if (list.length < 2) return <span className="text-xs text-[var(--muted)]">（1点）</span>;
  const w = 120;
  const h = 28;
  const ranks = list.map((e) => e.rank);
  const max = Math.max(...ranks);
  const min = Math.min(...ranks);
  const range = max - min || 1;
  // 順位は小さいほど良い → 上に表示
  const pts = ranks
    .map((r, i) => {
      const x = (i / (ranks.length - 1)) * w;
      const y = ((r - min) / range) * (h - 4) + 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth={1.5} />
    </svg>
  );
}
