"use client";

/**
 * MUSOU-EC コネクタ拡張との橋渡し（ページ側）。
 * 拡張の content.js が window.postMessage で relay する方式なので、拡張IDは不要。
 */

let extVersion: string | null = null;
const readyListeners = new Set<(v: string) => void>();

if (typeof window !== "undefined") {
  // 拡張が document_start で打ち込む DOM属性マーカーを同期的に読む（レースなし）
  try {
    const m = document.documentElement.getAttribute("data-musou-ext");
    if (m) extVersion = m;
  } catch {
    /* noop */
  }

  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    const d = ev.data as { source?: string; type?: string; version?: string };
    if (d && d.source === "musou-ec-ext" && d.type === "ready") {
      if (extVersion === null) {
        extVersion = d.version || "0";
        readyListeners.forEach((cb) => cb(extVersion!));
      }
    }
  });
  // 拡張の content script が先に "ready" を投げて取りこぼしても拾えるよう hello を数回送る
  const hello = () => window.postMessage({ source: "musou-ec-page", type: "hello" }, "*");
  hello();
  [100, 400, 1200, 3000].forEach((ms) => setTimeout(hello, ms));
}

export function hasExtension(): boolean {
  return extVersion !== null;
}

export function getExtensionVersion(): string | null {
  return extVersion;
}

/** 拡張の準備完了を購読（すでに準備済みなら即コール）。返り値で解除。 */
export function onExtensionReady(cb: (version: string) => void): () => void {
  if (extVersion !== null) cb(extVersion);
  readyListeners.add(cb);
  return () => readyListeners.delete(cb);
}

let seq = 0;

/** 拡張にリクエストを投げて結果を待つ。拡張が無ければ reject。 */
export function extRequest<T = unknown>(
  req: Record<string, unknown> & { type: string },
  timeoutMs = 30000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    const id = `mx-${Date.now()}-${++seq}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMsg);
      reject(new Error("拡張の応答がタイムアウトしました"));
    }, timeoutMs);
    function onMsg(ev: MessageEvent) {
      if (ev.source !== window) return;
      const d = ev.data as {
        source?: string;
        type?: string;
        id?: string;
        ok?: boolean;
        data?: unknown;
        error?: string;
      };
      if (!d || d.source !== "musou-ec-ext" || d.type !== "res" || d.id !== id) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMsg);
      if (d.ok) resolve(d.data as T);
      else reject(new Error(d.error || "拡張でエラーが発生しました"));
    }
    window.addEventListener("message", onMsg);
    window.postMessage({ source: "musou-ec-page", id, req }, "*");
  });
}

/** React 用フック。 */
import { useSyncExternalStore } from "react";
export function useExtension(): { ready: boolean; version: string | null } {
  const v = useSyncExternalStore(
    (cb) => onExtensionReady(() => cb()),
    () => extVersion,
    () => null,
  );
  return { ready: v !== null, version: v };
}
