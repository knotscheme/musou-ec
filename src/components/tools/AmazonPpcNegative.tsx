"use client";

import { useMemo, useState } from "react";
import { ToolShell, Field, NumberInput, Stat } from "@/components/ToolShell";
import { parseCSV, downloadCSV } from "@/lib/csv";
import { splitHeader, findCol, num } from "@/lib/csvmap";
import { recordHistory } from "@/lib/history";

const yen = (n: number) => `¥${Math.round(n).toLocaleString()}`;

interface Term {
  term: string;
  clicks: number;
  spend: number;
  orders: number;
  sales: number;
  acos: number;
}

export default function AmazonPpcNegative() {
  const [rows, setRows] = useState<Term[]>([]);
  const [spendLimit, setSpendLimit] = useState(1000);
  const [minClicks, setMinClicks] = useState(10);
  const [targetAcos, setTargetAcos] = useState(35);

  function onFile(file: File | undefined) {
    if (!file) return;
    file.text().then((t) => {
      const { header, rows } = splitHeader(parseCSV(t));
      const iTerm = findCol(header, ["カスタマーの検索キーワード", "customer search term", "検索用語", "search term", "検索キーワード"]);
      const iClk = findCol(header, ["クリック", "clicks", "クリック数"]);
      const iSpend = findCol(header, ["費用", "spend", "広告費", "cost"]);
      const iOrd = findCol(header, ["注文", "orders", "注文数", "7 day total orders", "合計注文数（7日間）"]);
      const iSales = findCol(header, ["売上高", "sales", "7 day total sales", "合計売上高（7日間）", "広告売上"]);
      const parsed: Term[] = rows
        .map((r) => {
          const spend = iSpend >= 0 ? num(r[iSpend]) : 0;
          const sales = iSales >= 0 ? num(r[iSales]) : 0;
          return {
            term: iTerm >= 0 ? r[iTerm] ?? "" : r[0] ?? "",
            clicks: iClk >= 0 ? num(r[iClk]) : 0,
            spend,
            orders: iOrd >= 0 ? num(r[iOrd]) : 0,
            sales,
            acos: sales > 0 ? spend / sales : spend > 0 ? Infinity : 0,
          };
        })
        .filter((x) => x.term);
      setRows(parsed);
    });
  }

  const result = useMemo(() => {
    const exclude: (Term & { reason: string })[] = [];
    const review: (Term & { reason: string })[] = [];
    for (const t of rows) {
      if (t.orders === 0 && (t.spend >= spendLimit || t.clicks >= minClicks)) {
        exclude.push({ ...t, reason: t.spend >= spendLimit ? `費用${yen(t.spend)}・CV0` : `${t.clicks}クリック・CV0` });
      } else if (t.orders >= 1 && t.acos * 100 > targetAcos) {
        review.push({ ...t, reason: `ACoS ${(t.acos * 100).toFixed(0)}% > 目標${targetAcos}%` });
      }
    }
    exclude.sort((a, b) => b.spend - a.spend);
    review.sort((a, b) => b.spend - a.spend);
    const wasted = exclude.reduce((s, t) => s + t.spend, 0);
    return { exclude, review, wasted };
  }, [rows, spendLimit, minClicks, targetAcos]);

  function exportCsv() {
    downloadCSV("negative-keywords", [
      ["区分", "検索用語", "理由", "クリック", "費用", "注文", "ACoS"],
      ...result.exclude.map((t) => ["除外推奨", t.term, t.reason, t.clicks, Math.round(t.spend), t.orders, Number.isFinite(t.acos) ? `${(t.acos * 100).toFixed(0)}%` : "-"]),
      ...result.review.map((t) => ["要見直し", t.term, t.reason, t.clicks, Math.round(t.spend), t.orders, `${(t.acos * 100).toFixed(0)}%`]),
    ]);
    recordHistory("amazon-ppc-negative", `除外候補 ${result.exclude.length}件`, `無駄費用 ${yen(result.wasted)}`);
  }

  return (
    <ToolShell slug="amazon-ppc-negative">
      <Field label="検索用語レポートCSV" hint="スポンサープロダクトの『検索用語』レポートを書き出してアップロード">
        <input type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="費用しきい値（円）" hint="この額以上使ってCV0なら除外">
          <NumberInput value={spendLimit} onChange={(e) => setSpendLimit(+e.target.value)} />
        </Field>
        <Field label="最低クリック数" hint="これ以上クリックされてCV0なら除外">
          <NumberInput value={minClicks} onChange={(e) => setMinClicks(+e.target.value)} />
        </Field>
        <Field label="目標ACoS（%）">
          <NumberInput value={targetAcos} onChange={(e) => setTargetAcos(+e.target.value)} />
        </Field>
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="解析した検索用語" value={`${rows.length}`} />
            <Stat label="除外推奨" value={`${result.exclude.length}`} tone={result.exclude.length ? "bad" : "ok"} />
            <Stat label="除外で削れる無駄費用" value={yen(result.wasted)} accent />
          </div>

          <div className="flex gap-2">
            <button onClick={exportCsv} className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white">
              除外KWリストCSV
            </button>
            <button
              onClick={() => navigator.clipboard?.writeText(result.exclude.map((t) => t.term).join("\n"))}
              className="rounded-md border px-4 py-2 text-sm font-semibold"
            >
              除外KWをコピー
            </button>
          </div>

          <TermTable title="完全一致で除外推奨（無駄クリック）" items={result.exclude} tone="#bf0000" />
          <TermTable title="要見直し（高ACoS・入札/一致タイプ調整）" items={result.review} tone="#a1701c" />
        </>
      )}
    </ToolShell>
  );
}

function TermTable({
  title,
  items,
  tone,
}: {
  title: string;
  items: { term: string; reason: string; clicks: number; spend: number; orders: number; acos: number }[];
  tone: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold" style={{ color: tone }}>
        {title}（{items.length}）
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr className="border-b text-left text-[var(--muted)]">
              <th className="py-2 pr-3">検索用語</th>
              <th className="py-2 pr-3">クリック</th>
              <th className="py-2 pr-3">費用</th>
              <th className="py-2 pr-3">注文</th>
              <th className="py-2 pr-3">理由</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 50).map((t, i) => (
              <tr key={i} className="border-b">
                <td className="py-2 pr-3">{t.term}</td>
                <td className="py-2 pr-3">{t.clicks}</td>
                <td className="py-2 pr-3">{yen(t.spend)}</td>
                <td className="py-2 pr-3">{t.orders}</td>
                <td className="py-2 pr-3 text-[var(--muted)]">{t.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
