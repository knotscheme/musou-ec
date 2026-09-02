"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell, Field, TextInput, Stat } from "@/components/ToolShell";
import { ExtensionNote } from "@/components/ExtensionNote";
import { idbGet, idbPut } from "@/lib/idb";
import { getOwnerId } from "@/lib/guest";
import { downloadCSV } from "@/lib/csv";

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

  const owner = typeof window !== "undefined" ? getOwnerId() : "";

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
        auto="キーワードと対象商品を登録すると、拡張が毎日あなたのブラウザから検索順位を自動取得し、この表に記録します。"
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
        <button onClick={add} className="mt-2 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
          記録を追加
        </button>
      </div>

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
