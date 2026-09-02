"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, Stat } from "@/components/ToolShell";
import { byteLen, tokenize, toHankaku } from "@/lib/text";
import { recordHistory } from "@/lib/history";

export default function AmazonA9Keyword() {
  const [title, setTitle] = useState("");
  const [bullets, setBullets] = useState("");
  const [backend, setBackend] = useState("");

  const r = useMemo(() => {
    const titleBytes = byteLen(title);
    const backendBytes = byteLen(backend.replace(/[,、]/g, " "));
    const norm = (s: string) => toHankaku(s).toLowerCase();

    const titleWords = new Set(tokenize(norm(title)));
    const bulletWords = new Set(tokenize(norm(bullets)));
    const backendWords = tokenize(norm(backend));

    // バックエンドKWの重複（タイトル/箇条書きに既出＝もったいない、または自己重複）
    const seen = new Set<string>();
    const dupInBackend: string[] = [];
    const wastedInBackend: string[] = [];
    for (const w of backendWords) {
      if (seen.has(w)) dupInBackend.push(w);
      seen.add(w);
      if (titleWords.has(w) || bulletWords.has(w)) wastedInBackend.push(w);
    }

    // 全文の出現頻度（キーワードスタッフィング検知）
    const all = tokenize(norm(`${title} ${bullets} ${backend}`));
    const freq = new Map<string, number>();
    for (const w of all) freq.set(w, (freq.get(w) ?? 0) + 1);
    const overused = [...freq.entries()].filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]);

    return {
      titleBytes,
      backendBytes,
      dupInBackend: [...new Set(dupInBackend)],
      wastedInBackend: [...new Set(wastedInBackend)],
      overused,
      uniqueBackend: seen.size,
    };
  }, [title, bullets, backend]);

  return (
    <ToolShell slug="amazon-a9-keyword">
      <Field label="商品タイトル">
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      <Field label="箇条書き（商品の特徴）" hint="全行まとめて貼り付け">
        <textarea
          value={bullets}
          onChange={(e) => setBullets(e.target.value)}
          rows={4}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      <Field label="検索キーワード（バックエンド）" hint="上限250バイト・重複や商品名の再掲は無駄">
        <textarea
          value={backend}
          onChange={(e) => setBackend(e.target.value)}
          rows={2}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="タイトル バイト数" value={`${r.titleBytes}`} tone={r.titleBytes > 400 ? "warn" : "ok"} />
        <Stat
          label="バックエンドKW バイト数"
          value={`${r.backendBytes} / 250`}
          tone={r.backendBytes > 250 ? "bad" : r.backendBytes === 0 ? "warn" : "ok"}
        />
        <Stat label="バックエンド有効語数" value={`${r.uniqueBackend}`} />
      </div>

      {r.backendBytes > 250 && (
        <p className="text-sm" style={{ color: "#bf0000" }}>
          250バイトを超えた分は索引されません。{r.backendBytes - 250} バイト削減してください。
        </p>
      )}

      <div className="space-y-3">
        <Finding
          title="バックエンドKWの自己重複"
          words={r.dupInBackend}
          empty="重複なし"
          hint="同じ語の繰り返しは無効。1回に整理。"
        />
        <Finding
          title="タイトル/箇条書きと重複（無駄なバックエンドKW）"
          words={r.wastedInBackend}
          empty="重複なし"
          hint="既に索引済み。別の未使用KWに置き換えると枠を有効活用できる。"
        />
        <Finding
          title="使いすぎの語（4回以上・スタッフィング疑い）"
          words={r.overused.map(([w, n]) => `${w}(${n})`)}
          empty="問題なし"
          hint="不自然な繰り返しはA9/ガイドライン違反リスク。自然な文に。"
        />
      </div>

      <button
        onClick={() =>
          recordHistory(
            "amazon-a9-keyword",
            `バックエンド ${r.backendBytes}/250byte`,
            `無駄KW ${r.wastedInBackend.length} / 重複 ${r.dupInBackend.length}`,
          )
        }
        className="rounded-md border px-4 py-2 text-sm font-semibold"
      >
        履歴に保存
      </button>
    </ToolShell>
  );
}

function Finding({
  title,
  words,
  empty,
  hint,
}: {
  title: string;
  words: string[];
  empty: string;
  hint: string;
}) {
  return (
    <div className="card p-3 text-sm">
      <div className="font-semibold">{title}</div>
      {words.length === 0 ? (
        <p className="mt-1 text-[var(--muted)]">{empty}</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {words.map((w) => (
              <span key={w} className="rounded bg-[var(--surface-soft)] px-2 py-0.5">
                {w}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p>
        </>
      )}
    </div>
  );
}
