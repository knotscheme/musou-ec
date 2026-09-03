"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";

const KEY = "musou.theme";
const MQ = "(prefers-color-scheme: dark)";

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** <html> に data-theme と .theme-dark を反映する */
export function applyTheme(pref: ThemePref) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", pref);
  const dark =
    pref === "dark" ||
    (pref !== "light" && window.matchMedia && window.matchMedia(MQ).matches);
  root.classList.toggle("theme-dark", dark);
}

const subs = new Set<() => void>();

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* ignore */
  }
  applyTheme(pref);
  subs.forEach((f) => f());
}

function subscribe(cb: () => void) {
  subs.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      applyTheme(getThemePref());
      cb();
    }
  };
  const mq = window.matchMedia(MQ);
  const onMq = () => {
    if (getThemePref() === "system") applyTheme("system");
  };
  window.addEventListener("storage", onStorage);
  mq.addEventListener("change", onMq);
  return () => {
    subs.delete(cb);
    window.removeEventListener("storage", onStorage);
    mq.removeEventListener("change", onMq);
  };
}

export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const pref = useSyncExternalStore(subscribe, getThemePref, () => "system" as ThemePref);
  return [pref, setThemePref];
}
