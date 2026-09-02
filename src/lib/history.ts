/**
 * ツール実行履歴。IndexedDB の history ストアに保存し、
 * owner（ゲスト仮ID or 会員ID）で絞り込む。
 */

import { idbAdd, idbGetAll, idbDelete } from "./idb";
import { getOwnerId } from "./guest";

export interface HistoryEntry {
  id?: number;
  owner: string;
  tool: string;
  title: string;
  summary: string;
  payload?: unknown;
  createdAt: number;
}

export async function recordHistory(
  tool: string,
  title: string,
  summary: string,
  payload?: unknown,
): Promise<void> {
  try {
    await idbAdd<HistoryEntry>("history", {
      owner: getOwnerId(),
      tool,
      title,
      summary,
      payload,
      createdAt: Date.now(),
    });
  } catch {
    /* 保存不可環境では無視（機能は継続） */
  }
}

export async function listHistory(tool?: string): Promise<HistoryEntry[]> {
  try {
    const owner = getOwnerId();
    const all = await idbGetAll<HistoryEntry>("history");
    return all
      .filter((h) => h.owner === owner && (!tool || h.tool === tool))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function deleteHistory(id: number): Promise<void> {
  try {
    await idbDelete("history", id);
  } catch {
    /* ignore */
  }
}
