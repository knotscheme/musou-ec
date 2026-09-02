/**
 * ノーコード トップページビルダーの「LP保存リスト」。
 * 端末内 IndexedDB（kv ストア）に複数の LP を名前付きで保存する。
 * 自動復旧スロット（pagebuilder:<target>）とは別枠で、こちらは明示的な保存。
 */

import { idbGetAll, idbGet, idbPut, idbDelete } from "@/lib/idb";
import type { Block, Theme } from "@/lib/pagebuilder";

export type PbTarget = "rakuten" | "yahoo";

export interface SavedLP {
  id: string;
  name: string;
  target: PbTarget;
  blocks: Block[];
  title: string;
  baseUrl: string;
  theme: Theme;
  createdAt: number;
  updatedAt: number;
}

interface KVRow {
  key: string;
  value: SavedLP;
}

const PREFIX = "pagebuilder:doc:";
const rid = () => Math.random().toString(36).slice(2, 10);

/** 保存済み LP を新しい順で返す。target を渡すとそのモールのみ。 */
export async function listLPs(target?: PbTarget): Promise<SavedLP[]> {
  try {
    const rows = await idbGetAll<KVRow>("kv");
    return rows
      .filter((r) => typeof r.key === "string" && r.key.startsWith(PREFIX) && r.value && Array.isArray(r.value.blocks))
      .map((r) => r.value)
      .filter((lp) => !target || lp.target === target)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

export async function getLP(id: string): Promise<SavedLP | undefined> {
  try {
    const row = await idbGet<KVRow>("kv", PREFIX + id);
    return row?.value;
  } catch {
    return undefined;
  }
}

/** 新規作成 or 上書き保存。id を渡すと上書き（createdAt は維持）。 */
export async function saveLP(
  input: {
    id?: string;
    name: string;
    target: PbTarget;
    blocks: Block[];
    title: string;
    baseUrl: string;
    theme: Theme;
  },
): Promise<SavedLP> {
  const now = Date.now();
  const existing = input.id ? await getLP(input.id) : undefined;
  const doc: SavedLP = {
    id: input.id || rid(),
    name: (input.name || "").trim() || "無題のLP",
    target: input.target,
    blocks: input.blocks,
    title: input.title,
    baseUrl: input.baseUrl,
    theme: input.theme,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await idbPut("kv", { key: PREFIX + doc.id, value: doc });
  return doc;
}

export async function renameLP(id: string, name: string): Promise<void> {
  const lp = await getLP(id);
  if (!lp) return;
  await idbPut("kv", { key: PREFIX + id, value: { ...lp, name: name.trim() || lp.name, updatedAt: Date.now() } });
}

export async function deleteLP(id: string): Promise<void> {
  try {
    await idbDelete("kv", PREFIX + id);
  } catch {
    /* ignore */
  }
}

export async function duplicateLP(id: string): Promise<SavedLP | undefined> {
  const src = await getLP(id);
  if (!src) return undefined;
  return saveLP({
    name: `${src.name}（コピー）`,
    target: src.target,
    blocks: src.blocks,
    title: src.title,
    baseUrl: src.baseUrl,
    theme: src.theme,
  });
}

export const pbBuilderPath = (target: PbTarget, lpId?: string) =>
  `/tools/${target}-page-builder/${lpId ? `?lp=${encodeURIComponent(lpId)}` : ""}`;
