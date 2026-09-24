/**
 * JSON-LDを<script>タグへ埋め込む際、本文中に "</script>" が含まれていると
 * ブラウザがスクリプトの終了タグと誤認してレンダリングが壊れる問題を防ぐ
 * (products/saas/spiderのsafeJsonLdと同じ対策)。
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
