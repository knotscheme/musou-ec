/** CSV のヘッダー行から、別名リストにマッチする列インデックスを探す。 */
export function findCol(header: string[], aliases: string[]): number {
  const norm = (s: string) => s.replace(/[\s"'　（）()【】\[\]]/g, "").toLowerCase();
  const H = header.map(norm);
  for (const a of aliases) {
    const na = norm(a);
    const i = H.findIndex((h) => h === na);
    if (i >= 0) return i;
  }
  for (const a of aliases) {
    const na = norm(a);
    const i = H.findIndex((h) => h.includes(na) || na.includes(h));
    if (i >= 0) return i;
  }
  return -1;
}

export function num(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

/** ヘッダー付き行配列を {header, rows} に。空行は除去。 */
export function splitHeader(all: string[][]): { header: string[]; rows: string[][] } {
  const clean = all.filter((r) => r.some((c) => c.trim() !== ""));
  return { header: clean[0] ?? [], rows: clean.slice(1) };
}
