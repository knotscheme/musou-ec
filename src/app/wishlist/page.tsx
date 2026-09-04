"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MALLS, type MallId } from "@/lib/malls";
import { ToolIcon } from "@/components/ToolIcon";
import { StatusBadge, VoteButton } from "@/components/ToolMeta";
import { getOwnerId } from "@/lib/guest";
import {
  SEED_IDEAS,
  MALL_CHOICES,
  ENDPOINT_CONFIGURED,
  submitIdea,
  listLocalIdeas,
  deleteLocalIdea,
  rankedWipTools,
  getVotes,
  pingEndpoint,
  type IdeaSubmission,
} from "@/lib/wishlist";

const mallLabel = (m: MallId | "any") => (m === "any" ? "全体・横断" : MALLS[m].label);

export default function WishlistPage() {
  const [text, setText] = useState("");
  const [mall, setMall] = useState<MallId | "any">("any");
  const [sent, setSent] = useState(false);
  const [local, setLocal] = useState<IdeaSubmission[]>([]);
  const [ranked, setRanked] = useState<Awaited<ReturnType<typeof rankedWipTools>>>([]);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);
  const [pingMsg, setPingMsg] = useState("");
  const [myOwner, setMyOwner] = useState("");

  useEffect(() => {
    setMyOwner(getOwnerId());
  }, []);

  useEffect(() => {
    listLocalIdeas().then(setLocal);
    rankedWipTools().then(setRanked);
    getVotes().then(setVotes);
  }, [tick]);

  const ideas = useMemo(() => {
    const merged = [
      ...SEED_IDEAS.map((s) => ({ ...s, createdAt: 0, owner: "seed" }) as IdeaSubmission & {
        mall: MallId | "any";
      }),
      ...local,
    ];
    return merged
      .map((i) => ({ ...i, count: votes[`idea:${i.id}`] ?? 0 }))
      .sort((a, b) => b.count - a.count || b.createdAt - a.createdAt);
  }, [local, votes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 5) return;
    await submitIdea(text, mall);
    setText("");
    setSent(true);
    setTick((n) => n + 1);
  }

  const topRanked = ranked.slice(0, 12);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 text-xs text-[var(--muted)]">
        <Link href="/" className="hover:underline">
          ダッシュボード
        </Link>{" "}
        / あったらいいな
      </div>
      <h1 className="text-2xl font-bold">「こんなツールが欲しい」アンケート</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        いただいた投票・アイデアは、次に作るツールの優先順位に反映します。
        {ENDPOINT_CONFIGURED
          ? " 投票は集計サーバーに送信されます。"
          : " 現在はこの端末に保存されます（集計エンドポイント未設定）。"}
      </p>
      {ENDPOINT_CONFIGURED && (
        <p className="mt-1 text-xs">
          <button
            onClick={() => {
              pingEndpoint();
              setPingMsg("テスト送信しました。数秒後にスプレッドシートの responses シートを確認してください。");
            }}
            className="text-[var(--muted)] underline"
          >
            集計先へ送信テスト
          </button>
          {pingMsg && <span className="ml-2 text-[var(--muted)]">{pingMsg}</span>}
        </p>
      )}

      {/* 投稿フォーム */}
      <form onSubmit={handleSubmit} className="mt-6 card space-y-3 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">どんなツールが欲しいですか？</label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSent(false);
            }}
            rows={3}
            maxLength={400}
            placeholder="例）楽天とYahooの受注CSVを読み込んで、同梱できる注文を自動でまとめてくれるツール"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="mt-1 text-right text-[11px] text-[var(--muted)]">{text.length}/400</div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">対象</span>
            <select
              value={mall}
              onChange={(e) => setMall(e.target.value as MallId | "any")}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {MALL_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {mallLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={text.trim().length < 5}
            className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            送信
          </button>
          {sent && <span className="text-sm text-[var(--brand)]">ありがとうございます！反映しました。</span>}
        </div>
      </form>

      {/* 開発中ツールの優先度ランキング */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">開発中ツール 優先度ランキング</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">「▲ 欲しい」の多い順。上位から実装します。</p>
        <div className="mt-3 space-y-2">
          {topRanked.map(({ tool, votes: v }, i) => {
            const m = MALLS[tool.mall];
            return (
              <div
                key={tool.slug}
                className="card mall-bar flex items-center gap-3 p-3"
                style={{ ["--mall" as string]: m.color }}
              >
                <span className="w-5 text-center text-sm font-bold text-[var(--muted)]">
                  {i + 1}
                </span>
                <ToolIcon name={tool.icon} color={m.color} size={32} variant="soft" />
                <div className="min-w-0 flex-1">
                  <Link href={`/tools/${tool.slug}/`} className="font-medium hover:underline">
                    {tool.name}
                  </Link>
                  <div className="text-xs text-[var(--muted)]" style={{ color: m.color }}>
                    {m.label}
                  </div>
                </div>
                <span className="text-xs text-[var(--muted)]">{v} 票</span>
                <VoteButton voteId={`tool:${tool.slug}`} />
              </div>
            );
          })}
        </div>
      </section>

      {/* アイデア一覧 */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">アイデア一覧</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          リサーチ由来の候補＋みなさんの投稿。気になるものに投票できます。
        </p>
        <div className="mt-3 space-y-2">
          {ideas.map((idea) => (
            <div key={idea.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm">{idea.text}</p>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {mallLabel(idea.mall)}
                  {idea.owner === "seed" ? "・運営候補" : "・ユーザー投稿"}
                </div>
              </div>
              <span className="text-xs text-[var(--muted)]">{idea.count} 票</span>
              <VoteButton voteId={`idea:${idea.id}`} onChange={() => getVotes().then(setVotes)} />
              {idea.owner !== "seed" && myOwner && idea.owner === myOwner && (
                <button
                  onClick={async () => {
                    if (!confirm("この投稿を取り消しますか？")) return;
                    await deleteLocalIdea(idea.id);
                    setTick((n) => n + 1);
                  }}
                  title="自分の投稿を取り消す"
                  className="shrink-0 rounded border px-2 py-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  取消
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-center gap-2 text-sm text-[var(--muted)]">
        <StatusBadge status="wip" />
        = 開発中（モック） / <StatusBadge status="live" /> = 稼働中
      </div>
    </div>
  );
}
