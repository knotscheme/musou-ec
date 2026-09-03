"use client";

import { useThemePref } from "@/lib/theme";

/** OS のダークモード切替（system 設定時）や別タブでの変更に追従させるためだけの常設コンポーネント。 */
export function ThemeSync() {
  useThemePref();
  return null;
}
