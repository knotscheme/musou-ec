/**
 * 「あったらいいな」アンケート。
 * 開発中ツールの優先度投票と、新ツールのアイデア投稿を集める。
 *
 * MVP はローカル（IndexedDB kv ストア）に保存。
 * NEXT_PUBLIC_WISHLIST_ENDPOINT を設定すると、投票・投稿をその URL に
 * POST（no-cors / fire-and-forget）して中央に集約できる。
 * （Supabase の テーブル REST、GAS の doPost、Formspree などを想定）
 */

import { idbGet, idbPut } from "./idb";
import { getOwnerId } from "./guest";
import { MALL_ORDER, TOOLS, type MallId } from "./malls";

const VOTES_KEY = "wishlist.votes";
const IDEAS_KEY = "wishlist.ideas";
const ENDPOINT = process.env.NEXT_PUBLIC_WISHLIST_ENDPOINT || "";

export interface IdeaSubmission {
  id: string;
  text: string;
  mall: MallId | "any";
  createdAt: number;
  owner: string;
}

/** リサーチ由来の初期候補（ユーザー投票で優先度を可視化する） */
export const SEED_IDEAS: { id: string; text: string; mall: MallId | "any" }[] = [
  { id: "seed-multi-order", text: "複数モールの受注を1画面でCSV取込→まとめて発送用CSV出力", mall: "any" },
  { id: "seed-stock-sync", text: "在庫数を全モール横断で手動同期（CSV差分ベース）", mall: "any" },
  { id: "seed-double-price", text: "二重価格の根拠（最安提示日・期間）を証跡として管理", mall: "rakuten" },
  { id: "seed-rakuten-rgroup", text: "楽天のバリエーション（項目選択肢）設計をGUIで組んでCSV化", mall: "rakuten" },
  { id: "seed-amazon-oem-kw", text: "Amazon 競合 ASIN の想定検索KWを逆算（拡張）", mall: "amazon" },
  { id: "seed-yahoo-optionprice", text: "Yahoo オプション価格・在庫連動表の一括作成", mall: "yahoo" },
  { id: "seed-shopify-metafield", text: "Shopify メタフィールドの一括入力CSVジェネレーター", mall: "shopify" },
  { id: "seed-tax-round", text: "税込/税抜・端数処理の一括変換（軽減税率対応）", mall: "any" },
  { id: "seed-set-bundle", text: "セット商品の原価・利益を構成品から自動計算", mall: "any" },
  { id: "seed-ab-title", text: "商品名/サムネの A/B 案を並べて比較・記録", mall: "any" },
];

type VoteMap = Record<string, number>;

async function readVotes(): Promise<VoteMap> {
  const row = await idbGet<{ key: string; value: VoteMap }>("kv", VOTES_KEY).catch(() => undefined);
  return row?.value ?? {};
}

async function writeVotes(v: VoteMap): Promise<void> {
  await idbPut("kv", { key: VOTES_KEY, value: v }).catch(() => {});
}

async function readIdeas(): Promise<IdeaSubmission[]> {
  const row = await idbGet<{ key: string; value: IdeaSubmission[] }>("kv", IDEAS_KEY).catch(
    () => undefined,
  );
  return row?.value ?? [];
}

async function writeIdeas(list: IdeaSubmission[]): Promise<void> {
  await idbPut("kv", { key: IDEAS_KEY, value: list }).catch(() => {});
}

function post(kind: string, payload: Record<string, unknown>): void {
  if (!ENDPOINT) return;
  try {
    fetch(ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, owner: getOwnerId(), ts: Date.now(), ...payload }),
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export async function getVotes(): Promise<VoteMap> {
  return readVotes();
}

export async function toggleVote(id: string): Promise<VoteMap> {
  const votes = await readVotes();
  if (votes[id]) delete votes[id];
  else votes[id] = 1;
  await writeVotes(votes);
  post("vote", { id, active: Boolean(votes[id]) });
  return votes;
}

export async function submitIdea(text: string, mall: MallId | "any"): Promise<IdeaSubmission> {
  const idea: IdeaSubmission = {
    id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    text: text.trim().slice(0, 400),
    mall,
    createdAt: Date.now(),
    owner: getOwnerId(),
  };
  const list = await readIdeas();
  list.unshift(idea);
  await writeIdeas(list);
  post("idea", { id: idea.id, text: idea.text, mall: idea.mall });
  return idea;
}

export async function listLocalIdeas(): Promise<IdeaSubmission[]> {
  return readIdeas();
}

/** 開発中ツール一覧を「投票数の多い順」で返す（優先度ランキング用） */
export async function rankedWipTools() {
  const votes = await readVotes();
  return TOOLS.filter((t) => (t.status ?? "wip") === "wip")
    .map((t) => ({ tool: t, votes: votes[`tool:${t.slug}`] ?? 0 }))
    .sort((a, b) => b.votes - a.votes);
}

export const MALL_CHOICES: (MallId | "any")[] = ["any", ...MALL_ORDER];
export const ENDPOINT_CONFIGURED = Boolean(ENDPOINT);
