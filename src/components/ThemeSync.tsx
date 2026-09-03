"use client";

import { useEffect } from "react";
import { applyTheme, useThemePref } from "@/lib/theme";

/**
 * ハイドレーション後にテーマを再適用し、OS のダークモード切替（system 時）や
 * 別タブでの変更にも追従させる常設コンポーネント。
 * （boot script が <html> に付けたクラスが React のハイドレーションで消えても復元する）
 */
export function ThemeSync() {
  const [pref] = useThemePref();
  useEffect(() => {
    applyTheme(pref);
  }, [pref]);
  return null;
}
