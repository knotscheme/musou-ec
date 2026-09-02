/** テキスト解析の共通ユーティリティ。 */

export function byteLen(s: string): number {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s).length;
  return unescape(encodeURIComponent(s)).length;
}

export const STOPWORDS = new Set([
  "こちら", "です", "ます", "ました", "して", "する", "この", "その", "あの", "から", "など",
  "ため", "また", "および", "商品", "ページ", "こと", "もの", "よう", "ある", "いる", "れる",
  "とても", "本当に", "購入", "使用", "very", "the", "and", "for", "with", "this", "that",
]);

/** 日本語・英字の語をざっくり抽出（2文字以上）。 */
export function tokenize(text: string): string[] {
  return text.match(/[一-龠々ぁ-んァ-ヴー]{2,}|[A-Za-z][A-Za-z0-9-]{1,}/g) ?? [];
}

export function wordFrequency(text: string, minCount = 2): { word: string; n: number }[] {
  const freq = new Map<string, number>();
  for (const t of tokenize(text)) {
    if (STOPWORDS.has(t) || STOPWORDS.has(t.toLowerCase())) continue;
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...freq.entries()]
    .map(([word, n]) => ({ word, n }))
    .filter((x) => x.n >= minCount)
    .sort((a, b) => b.n - a.n);
}

/** 全角→半角（英数記号）。 */
export function toHankaku(s: string): string {
  return s
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}
