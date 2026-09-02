/**
 * ゲスト・会員連携。
 * 非会員の利用時は localStorage に仮ID（guest:xxxx）を発行・保存。
 * 会員ログイン時に仮IDと会員アカウントを紐付け、IndexedDB 上の
 * チャット履歴・ツール履歴の owner を会員IDへ引き継ぐ。
 *
 * MVP では認証バックエンドを持たないため「ログイン」はローカルの
 * モック（settings 画面で会員IDを入力）で表現する。Supabase 等の
 * 中央DBを繋ぐ際は setMemberId() を実ログイン後に呼べば動作は同じ。
 */

import { idbReassignOwner } from "./idb";

const GUEST_KEY = "musou.guestId";
const MEMBER_KEY = "musou.memberId";

function rand(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

export function getGuestId(): string {
  if (typeof window === "undefined") return "guest:ssr";
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest:${rand()}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function getMemberId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(MEMBER_KEY);
}

/** 現在の所有者。会員ならば会員ID、そうでなければゲスト仮ID。 */
export function getOwnerId(): string {
  return getMemberId() ?? getGuestId();
}

export function isMember(): boolean {
  return getMemberId() !== null;
}

/**
 * 会員ログイン/登録時に呼ぶ。ゲスト時代の履歴を会員IDへ移送する。
 * @returns 引き継いだレコード件数
 */
export async function linkGuestToMember(memberId: string): Promise<number> {
  const guestId = getGuestId();
  localStorage.setItem(MEMBER_KEY, memberId);
  if (guestId === memberId) return 0;
  let moved = 0;
  try {
    moved += await idbReassignOwner("chat", guestId, memberId);
    moved += await idbReassignOwner("history", guestId, memberId);
  } catch {
    /* IndexedDB 未対応環境では黙ってスキップ */
  }
  return moved;
}

/** モックのログアウト。会員IDを外し、以降はゲスト仮IDに戻る。 */
export function unlinkMember(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MEMBER_KEY);
}
