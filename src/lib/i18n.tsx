"use client";

import { createContext, useContext, useEffect, useCallback } from "react";
import { DICT, type Locale } from "@/i18n/dictionaries";

/**
 * 当面は日本人向けのため日本語固定。将来的に多言語化する場合は
 * ここで locale の切替（localStorage / navigator.language 検出）を復活させる。
 */
const FIXED_LOCALE: Locale = "ja";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof (typeof DICT)["ja"]) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = FIXED_LOCALE;

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(() => {
    /* 多言語切替は現在無効（日本語固定） */
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
