"use client";

import { useEffect, useMemo, useState } from "react";
import { ToolShell, Field, Stat } from "@/components/ToolShell";

/**
 * 楽天 違反点数累積リスク＆リセット日計算機。
 * 楽天の違反点数は「過去1年（365日）の累積」で判定される。過去の違反履歴を登録すると、
 * 現在有効な累積点数・危険度・点数が消えてリセットされる日を計算する。
 * データはこの端末の localStorage にのみ保存し、外部送信は一切しない。
 */

const STORE_KEY = "musou.rakuten-violation-points";
const DAY = 86_400_000;
const WINDOW_DAYS = 365;

interface Violation {
  id: string;
  date: string; // YYYY-MM-DD（違反発生日）
  label: string;
  points: number;
}

const PRESETS: { key: string; label: string; points: number }[] = [
  { key: "delay", label: "納期遅延 / キャンセル超過 等", points: 20 },
  { key: "search", label: "不適切な検索対策", points: 35 },
  { key: "guideline", label: "ガイドライン違反 等", points: 70 },
  { key: "severe", label: "重大な違反", points: 100 },
  { key: "custom", label: "その他（点数を手入力）", points: 0 },
];

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}
function fmtJP(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function loadStore(): Violation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Violation[];
    return Array.isArray(arr)
      ? arr.filter(
          (v) =>
            v &&
            typeof v.date === "string" &&
            typeof v.label === "string" &&
            Number.isFinite(v.points),
        )
      : [];
  } catch {
    return [];
  }
}
function saveStore(list: Violation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* 保存不可環境（プライベートブラウズ等）では無視して機能は継続 */
  }
}

function tierOf(total: number) {
  if (total >= 70)
    return {
      level: "危険",
      color: "#bf0000",
      bg: "#f6dede",
      headline: "70点以上：検索順位ダウン・休店リスク",
      desc: "検索順位の下落や出店停止の対象になり得る水準です。至急、改善報告と再発防止策を。",
    };
  if (total >= 35)
    return {
      level: "警戒",
      color: "#a1701c",
      bg: "#f7ecd9",
      headline: "35〜69点：違約金リスクあり",
      desc: "違約金が発生し得る水準です。新たな違反を出さないことが最優先。",
    };
  return {
    level: "安全",
    color: "#1a8a5a",
    bg: "#d6efe3",
    headline: "0〜34点：安全圏",
    desc: "現時点で累積による重いペナルティのリスクは低い水準です。この状態を維持しましょう。",
  };
}

export default function RakutenViolationRisk() {
  const [today] = useState(startOfToday);
  const todayStr = useMemo(() => toYMD(today), [today]);

  const [list, setList] = useState<Violation[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [date, setDate] = useState(todayStr);
  const [presetKey, setPresetKey] = useState("delay");
  const [customPoints, setCustomPoints] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setList(loadStore());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveStore(list);
  }, [list, loaded]);

  const rows = useMemo(
    () =>
      [...list]
        .map((v) => {
          const start = parseYMD(v.date);
          const expire = addDays(start, WINDOW_DAYS);
          const daysLeft = diffDays(today, expire);
          return { ...v, start, expire, daysLeft, active: daysLeft > 0 };
        })
        .sort((a, b) => b.start.getTime() - a.start.getTime()),
    [list, today],
  );

  const calc = useMemo(() => {
    const active = rows.filter((r) => r.active);
    const total = active.reduce((s, r) => s + r.points, 0);
    const nextExpire = active.reduce<(typeof active)[number] | null>(
      (min, r) => (!min || r.expire < min.expire ? r : min),
      null,
    );
    const lastExpire = active.reduce<(typeof active)[number] | null>(
      (max, r) => (!max || r.expire > max.expire ? r : max),
      null,
    );
    return {
      total,
      tier: tierOf(total),
      activeCount: active.length,
      nextExpire,
      nextDays: nextExpire ? Math.max(0, diffDays(today, nextExpire.expire)) : null,
      lastExpire,
      lastDays: lastExpire ? Math.max(0, diffDays(today, lastExpire.expire)) : null,
    };
  }, [rows, today]);

  const selectedPreset = PRESETS.find((p) => p.key === presetKey)!;

  function addViolation() {
    setError("");
    const preset = PRESETS.find((p) => p.key === presetKey)!;
    let pts = preset.points;
    if (preset.key === "custom") {
      pts = Math.floor(Number(customPoints));
      if (!Number.isFinite(pts) || pts <= 0) {
        setError("点数を1以上の数値で入力してください。");
        return;
      }
      if (pts > 500) {
        setError("点数が大きすぎます。500以下で入力してください。");
        return;
      }
    }
    if (!date) {
      setError("違反発生日を選択してください。");
      return;
    }
    const d = parseYMD(date);
    if (Number.isNaN(d.getTime())) {
      setError("違反発生日が正しくありません。");
      return;
    }
    if (d.getTime() > today.getTime()) {
      setError("違反発生日は今日以前の日付を指定してください。");
      return;
    }
    const label = preset.key === "custom" ? `その他 (${pts}点)` : preset.label;
    setList((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date, label, points: pts },
    ]);
    setCustomPoints("");
  }

  function remove(id: string) {
    setList((prev) => prev.filter((v) => v.id !== id));
  }
  function clearAll() {
    if (list.length && window.confirm("登録済みの違反履歴をすべて削除します。よろしいですか？")) {
      setList([]);
    }
  }

  return (
    <ToolShell slug="rakuten-violation-risk">
      {/* 入力フォーム */}
      <div className="card p-4">
        <p className="mb-3 text-sm font-semibold">違反履歴を追加</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="違反発生日">
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
          <Field label="違反内容と点数">
            <select
              value={presetKey}
              onChange={(e) => setPresetKey(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key === "custom" ? p.label : `${p.label} (${p.points}点)`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="点数（手入力）" hint="「その他」を選んだ場合に使用">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={customPoints}
              disabled={selectedPreset.key !== "custom"}
              onChange={(e) => setCustomPoints(e.target.value)}
              placeholder="例: 50"
              className="w-full rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={addViolation}
            className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            追加
          </button>
          {list.length > 0 && (
            <button
              onClick={clearAll}
              className="rounded-md border px-3 py-2 text-sm font-semibold text-[var(--muted)]"
            >
              全削除
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-[#bf0000]">{error}</p>}
      </div>

      {/* 現在の累積点数 */}
      <div
        className="card flex flex-col items-center justify-center gap-1 p-6 text-center"
        style={{ borderColor: calc.tier.color }}
      >
        <span className="text-xs font-medium text-[var(--muted)]">
          現在の累積点数（過去365日の有効分）
        </span>
        <span className="text-5xl font-extrabold tabular-nums" style={{ color: calc.tier.color }}>
          {calc.total}
          <span className="ml-1 text-2xl font-bold">点</span>
        </span>
        <span className="text-xs text-[var(--muted)]">
          有効な違反 {calc.activeCount} 件 / 登録 {list.length} 件・本日 {fmtJP(today)} 基準
        </span>
      </div>

      {/* 危険度アラート */}
      <div
        className="rounded-xl border p-4"
        style={{ background: calc.tier.bg, borderColor: calc.tier.color }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-sm font-bold text-white"
            style={{ background: calc.tier.color }}
          >
            {calc.tier.level}
          </span>
          <span className="text-sm font-semibold" style={{ color: calc.tier.color }}>
            {calc.tier.headline}
          </span>
        </div>
        <p className="mt-1.5 text-sm" style={{ color: calc.tier.color }}>
          {calc.tier.desc}
        </p>
      </div>

      {/* 点数リセットまでのカウントダウン */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="次に点数が減るまで"
          value={calc.nextDays === null ? "—" : `あと ${calc.nextDays} 日`}
          tone={calc.nextDays === null ? undefined : "ok"}
        />
        <Stat
          label="最も古い有効違反の失効日"
          value={calc.nextExpire ? fmtJP(calc.nextExpire.expire) : "—"}
        />
        <Stat
          label="失効後の見込み点数"
          value={calc.nextExpire ? `${calc.total - calc.nextExpire.points} 点` : "—"}
        />
        <Stat
          label="累積が0点に戻るまで（完全クリア）"
          value={calc.lastDays === null ? "0 日（対象なし）" : `あと ${calc.lastDays} 日`}
        />
        <Stat
          label="完全クリア予定日"
          value={calc.lastExpire ? fmtJP(calc.lastExpire.expire) : "—"}
          accent
        />
        <Stat label="有効な違反の件数" value={`${calc.activeCount} 件`} />
      </div>

      {/* 登録済み履歴リスト */}
      <div className="card p-4">
        <p className="mb-2 text-sm font-semibold">登録済みの違反履歴</p>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            まだ登録がありません。上のフォームから違反履歴を追加してください。
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li
                key={r.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm ${
                  r.active ? "" : "opacity-55"
                }`}
              >
                <span className={`font-semibold tabular-nums ${r.active ? "" : "line-through"}`}>
                  {fmtJP(r.start)}
                </span>
                <span className={`min-w-[8rem] flex-1 ${r.active ? "" : "line-through"}`}>
                  {r.label}
                </span>
                <span className={`font-bold tabular-nums ${r.active ? "" : "line-through"}`}>
                  {r.points}点
                </span>
                <span className="text-xs tabular-nums text-[var(--muted)]">
                  {r.active
                    ? `あと${r.daysLeft}日で失効（${fmtJP(r.expire)}）`
                    : `失効済み（${fmtJP(r.expire)}）`}
                </span>
                <button
                  onClick={() => remove(r.id)}
                  className="rounded border px-2 py-0.5 text-xs font-semibold text-[var(--muted)]"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-[var(--muted)]">
        ※ プルダウンの点数・危険度のしきい値は目安です。実際の違反点数と加点は違反内容ごとに異なり、
        最終的な判定は楽天 RMS の通知・ガイドラインが優先されます。入力した履歴と計算結果はこの端末
        （ブラウザの localStorage）にのみ保存され、外部サーバーには一切送信されません。
      </p>
    </ToolShell>
  );
}
