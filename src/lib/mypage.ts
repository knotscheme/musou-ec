"use client";

/**
 * マイページ：お気に入りツールと、用途別フォルダ。
 * この端末（localStorage）に保存する軽量な整理用データ。
 */

import { useCallback, useSyncExternalStore } from "react";

export interface Folder {
  id: string;
  name: string;
  slugs: string[];
}
export interface MyPageData {
  favorites: string[];
  folders: Folder[];
}

const KEY = "musou.mypage";
const EMPTY: MyPageData = { favorites: [], folders: [] };

let cache: MyPageData | null = null;
const listeners = new Set<() => void>();

function read(): MyPageData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const d = JSON.parse(raw) as MyPageData;
    return {
      favorites: Array.isArray(d.favorites) ? d.favorites : [],
      folders: Array.isArray(d.folders) ? d.folders : [],
    };
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): MyPageData {
  if (!cache) cache = read();
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

function set(next: MyPageData) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
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

const rid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

// ── actions ────────────────────────────────
export function toggleFavorite(slug: string) {
  const d = getSnapshot();
  const has = d.favorites.includes(slug);
  set({ ...d, favorites: has ? d.favorites.filter((s) => s !== slug) : [...d.favorites, slug] });
}

export function addFolder(name: string): string {
  const d = getSnapshot();
  const id = rid();
  set({ ...d, folders: [...d.folders, { id, name: name.trim() || "新しいフォルダ", slugs: [] }] });
  return id;
}

export function renameFolder(id: string, name: string) {
  const d = getSnapshot();
  set({ ...d, folders: d.folders.map((f) => (f.id === id ? { ...f, name } : f)) });
}

export function deleteFolder(id: string) {
  const d = getSnapshot();
  set({ ...d, folders: d.folders.filter((f) => f.id !== id) });
}

export function setFolderTools(id: string, slugs: string[]) {
  const d = getSnapshot();
  set({ ...d, folders: d.folders.map((f) => (f.id === id ? { ...f, slugs } : f)) });
}

export function toggleInFolder(id: string, slug: string) {
  const d = getSnapshot();
  set({
    ...d,
    folders: d.folders.map((f) =>
      f.id === id
        ? { ...f, slugs: f.slugs.includes(slug) ? f.slugs.filter((s) => s !== slug) : [...f.slugs, slug] }
        : f,
    ),
  });
}

export function moveFolder(id: string, dir: -1 | 1) {
  const d = getSnapshot();
  const i = d.folders.findIndex((f) => f.id === id);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= d.folders.length) return;
  const folders = [...d.folders];
  [folders[i], folders[j]] = [folders[j], folders[i]];
  set({ ...d, folders });
}

// ── hook ───────────────────────────────────
export function useMyPage() {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const isFavorite = useCallback((slug: string) => data.favorites.includes(slug), [data.favorites]);
  return {
    data,
    isFavorite,
    toggleFavorite,
    addFolder,
    renameFolder,
    deleteFolder,
    setFolderTools,
    toggleInFolder,
    moveFolder,
  };
}
