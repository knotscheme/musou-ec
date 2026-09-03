"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface LearnVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string;
  /** 再生回数（取得できないときは 0） */
  viewCount?: number;
  channelId: string;
  channelName: string;
  /** rakuten | amazon | yahoo | shopify | common */
  platform: string;
  /** 構築・設定 | 集客・SEO | 転換・CRO | 業務効率化 など */
  category: string;
  /** 関連する MUSOU-EC ツールのパス（任意） */
  relatedToolPath: string;
}

export type WatchStatus = "unwatched" | "watching" | "done";

export interface VideoProgress {
  status: WatchStatus;
  note: string;
  fav: boolean;
}

export const PURPOSE_CATEGORIES = ["構築・設定", "集客・SEO", "転換・CRO", "業務効率化"] as const;

export const STATUS_META: Record<WatchStatus, { label: string; color: string }> = {
  unwatched: { label: "未視聴", color: "#9aa0a6" },
  watching: { label: "視聴中", color: "#a1701c" },
  done: { label: "完了", color: "#1a8a5a" },
};

const KEY = "musou.learn";
const EMPTY: VideoProgress = { status: "unwatched", note: "", fav: false };

type Store = Record<string, VideoProgress>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

let cache: Store = read();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function persist(next: Store) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = read();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLearn() {
  const store = useSyncExternalStore(subscribe, () => cache, () => cache);

  const get = useCallback((id: string): VideoProgress => store[id] ?? EMPTY, [store]);

  const patch = useCallback((id: string, p: Partial<VideoProgress>) => {
    const cur = cache[id] ?? EMPTY;
    persist({ ...cache, [id]: { ...cur, ...p } });
  }, []);

  const setStatus = useCallback((id: string, status: WatchStatus) => patch(id, { status }), [patch]);
  const setNote = useCallback((id: string, note: string) => patch(id, { note }), [patch]);
  const toggleFav = useCallback(
    (id: string) => patch(id, { fav: !(cache[id]?.fav ?? false) }),
    [patch],
  );

  return { store, get, setStatus, setNote, toggleFav };
}
