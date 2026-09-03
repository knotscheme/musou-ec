import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // マウント後に localStorage 読み込み / ロケール判定を state に反映するのは
      // 静的エクスポート + ハイドレーション不一致回避のため意図的。
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // apps/extension は Chrome拡張（chrome.* グローバル前提の素の JS）なので Next 用 lint の対象外
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "apps/**"]),
]);

export default eslintConfig;
