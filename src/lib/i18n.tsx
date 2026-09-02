"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DICT, LOCALES, type Locale } from "@/i18n/dictionaries";

const STORE = "musou.locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof (typeof DICT)["ja"]) => string;
};

const I18nContext = createContext<Ctx | null>(null);

function detect(): Locale {
  if (typeof window === "undefined") return "ja";
  const saved = localStorage.getItem(STORE) as Locale | null;
  if (saved && LOCALES.includes(saved)) return saved;
  const nav = navigator.language.slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(nav) ? (nav as Locale) : "ja";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja");

  useEffect(() => {
    setLocaleState(detect());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORE, l);
  }, []);

  const t = useCallback(
    (key: keyof (typeof DICT)["ja"]) => DICT[locale][key] ?? DICT.ja[key] ?? key,
    [locale],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
