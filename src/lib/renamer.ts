/**
 * CSV一括リネームのコアロジック（ブラウザ内・サーバー不要）。
 *
 * ルールを上から順に適用してファイル名を組み立てる。名前変換系は「拡張子を除いた本体（stem）」に、
 * 拡張子ルールだけが拡張子（ext）に作用する。実ファイルは変更せず、
 * プレビュー・変換マップCSV・リネーム済みコピーZIP・リネームスクリプトを生成するために使う。
 */

// ============================================================================
// 型
// ============================================================================

export type RulePosition = "prefix" | "suffix";

/** 拡張子も対象にできる文字操作系ルールに付く共通フラグ */
export interface IncludeExt {
  /** true なら拡張子を含むフルネームに適用する */
  includeExt: boolean;
}

export type RenameRule =
  | { id: string; enabled: boolean; type: "sequence"; position: RulePosition | "replace"; start: number; step: number; digits: number; separator: string }
  | ({ id: string; enabled: boolean; type: "insert"; text: string; position: "prefix" | "suffix" | "at"; index: number } & IncludeExt)
  | ({ id: string; enabled: boolean; type: "deleteChars"; from: "start" | "end"; count: number } & IncludeExt)
  | ({ id: string; enabled: boolean; type: "deleteKeyword"; keyword: string; all: boolean } & IncludeExt)
  | ({ id: string; enabled: boolean; type: "replace"; find: string; replaceWith: string; regex: boolean; all: boolean; caseInsensitive: boolean } & IncludeExt)
  | { id: string; enabled: boolean; type: "ext"; mode: "set" | "lower" | "upper"; value: string }
  | ({ id: string; enabled: boolean; type: "caseConv"; mode: "lower" | "upper" | "capitalize" } & IncludeExt)
  | ({ id: string; enabled: boolean; type: "widthConv"; mode: "toHalf" | "toFull"; scope: "alnum" | "katakana" | "both" } & IncludeExt)
  | { id: string; enabled: boolean; type: "date"; source: "modified" | "exif"; format: string; position: RulePosition; separator: string }
  | { id: string; enabled: boolean; type: "csvMap"; pairs: [string, string][]; matchBy: "name" | "stem" }
  | { id: string; enabled: boolean; type: "textOverride"; names: string[] };

export type RuleType = RenameRule["type"];

export interface RenameInput {
  name: string;
  lastModified: number;
  /** 画像なら EXIF 撮影日時（ms）。未取得は null */
  exifDate?: number | null;
}

export interface RenameRow {
  index: number;
  input: RenameInput;
  newName: string;
  changed: boolean;
  collision: boolean;
  error: string | null;
}

// ============================================================================
// 文字種変換
// ============================================================================

/** 全角英数字・記号・空白 → 半角 */
export function toHalfAlnum(s: string): string {
  return s
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ");
}
/** 半角英数字・記号・空白 → 全角 */
export function toFullAlnum(s: string): string {
  return s
    .replace(/ /g, "　")
    .replace(/[!-~]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0));
}

// 半角カナ → 全角カナ（濁点・半濁点の合成を含む）
const HALF_KANA =
  "｡｢｣､･ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";
const FULL_KANA =
  "。「」、・ヲァィゥェォャュョッーアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン";
const HALF_TO_FULL_KANA: Record<string, string> = {};
for (let i = 0; i < HALF_KANA.length; i++) HALF_TO_FULL_KANA[HALF_KANA[i]] = FULL_KANA[i];
const FULL_TO_HALF_KANA: Record<string, string> = {};
for (let i = 0; i < FULL_KANA.length; i++) FULL_TO_HALF_KANA[FULL_KANA[i]] = HALF_KANA[i];
// 濁点付き全角カナ → 半角2文字
const FULL_DAKUTEN =
  "ガギグゲゴザジズゼゾダヂヅデドバビブベボヴ";
const FULL_HANDAKUTEN = "パピプペポ";

export function toFullKatakana(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (HALF_TO_FULL_KANA[ch]) {
      const base = HALF_TO_FULL_KANA[ch];
      if (next === "ﾞ" && "カキクケコサシスセソタチツテトハヒフヘホウ".includes(base)) {
        out += String.fromCharCode(base.charCodeAt(0) + (base === "ウ" ? 78 : 1));
        i++;
        continue;
      }
      if (next === "ﾟ" && "ハヒフヘホ".includes(base)) {
        out += String.fromCharCode(base.charCodeAt(0) + 2);
        i++;
        continue;
      }
      out += base;
    } else {
      out += ch;
    }
  }
  return out;
}

export function toHalfKatakana(s: string): string {
  let out = "";
  for (const ch of s) {
    if (FULL_TO_HALF_KANA[ch]) out += FULL_TO_HALF_KANA[ch];
    else if (FULL_DAKUTEN.includes(ch)) {
      const plain = String.fromCharCode(ch.charCodeAt(0) - (ch === "ヴ" ? 78 : 1));
      out += (FULL_TO_HALF_KANA[plain] ?? plain) + "ﾞ";
    } else if (FULL_HANDAKUTEN.includes(ch)) {
      const plain = String.fromCharCode(ch.charCodeAt(0) - 2);
      out += (FULL_TO_HALF_KANA[plain] ?? plain) + "ﾟ";
    } else out += ch;
  }
  return out;
}

// ============================================================================
// 補助
// ============================================================================

export function splitName(name: string): { stem: string; ext: string } {
  const i = name.lastIndexOf(".");
  if (i <= 0) return { stem: name, ext: "" }; // 先頭ドット or 拡張子なし
  return { stem: name.slice(0, i), ext: name.slice(i) };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeWords(s: string): string {
  return s.replace(/(^|[\s_\-.])([a-z])/g, (_, sep, c) => sep + c.toUpperCase());
}

function fmtDate(ms: number, format: string): string {
  const d = new Date(ms);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const map: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    YY: String(d.getFullYear()).slice(-2),
    MM: p2(d.getMonth() + 1),
    DD: p2(d.getDate()),
    hh: p2(d.getHours()),
    mm: p2(d.getMinutes()),
    ss: p2(d.getSeconds()),
  };
  return format.replace(/YYYY|YY|MM|DD|hh|mm|ss/g, (t) => map[t] ?? t);
}

// ============================================================================
// 1ルール適用
// ============================================================================

interface Ctx {
  index: number;
  input: RenameInput;
}

/** ルール1つを適用。戻り値は次段へ渡す {stem, ext}。error は throw ではなく呼び出し側で拾う。 */
function applyRule(
  rule: RenameRule,
  stem: string,
  ext: string,
  ctx: Ctx,
): { stem: string; ext: string } {
  switch (rule.type) {
    case "sequence": {
      const digits = Math.max(0, Math.min(12, rule.digits || 0));
      const n = rule.start + ctx.index * (rule.step || 0);
      const num = String(n).padStart(digits, "0");
      if (rule.position === "prefix") return { stem: num + rule.separator + stem, ext };
      if (rule.position === "suffix") return { stem: stem + rule.separator + num, ext };
      return { stem: num, ext };
    }
    case "insert": {
      if (!rule.text) return { stem, ext };
      if (rule.position === "prefix") return { stem: rule.text + stem, ext };
      if (rule.position === "suffix") return { stem: stem + rule.text, ext };
      const i = Math.max(0, Math.min(stem.length, rule.index || 0));
      return { stem: stem.slice(0, i) + rule.text + stem.slice(i), ext };
    }
    case "deleteChars": {
      const c = Math.max(0, rule.count || 0);
      if (rule.from === "start") return { stem: stem.slice(c), ext };
      return { stem: c >= stem.length ? "" : stem.slice(0, stem.length - c), ext };
    }
    case "deleteKeyword": {
      if (!rule.keyword) return { stem, ext };
      return {
        stem: rule.all ? stem.split(rule.keyword).join("") : stem.replace(rule.keyword, ""),
        ext,
      };
    }
    case "replace": {
      if (!rule.find) return { stem, ext };
      const flags = (rule.all ? "g" : "") + (rule.caseInsensitive ? "i" : "");
      if (rule.regex) {
        const re = new RegExp(rule.find, flags); // 無効な正規表現は呼び出し側が catch
        return { stem: stem.replace(re, rule.replaceWith), ext };
      }
      const re = new RegExp(escapeRegExp(rule.find), flags || undefined);
      const rep = rule.replaceWith.replace(/\$/g, "$$$$"); // $ をリテラル化
      return { stem: stem.replace(re, rep), ext };
    }
    case "ext": {
      if (rule.mode === "lower") return { stem, ext: ext.toLowerCase() };
      if (rule.mode === "upper") return { stem, ext: ext.toUpperCase() };
      const v = rule.value.trim();
      if (!v) return { stem, ext: "" };
      return { stem, ext: v.startsWith(".") ? v : "." + v };
    }
    case "caseConv": {
      if (rule.mode === "lower") return { stem: stem.toLowerCase(), ext };
      if (rule.mode === "upper") return { stem: stem.toUpperCase(), ext };
      return { stem: capitalizeWords(stem.toLowerCase()), ext };
    }
    case "widthConv": {
      let s = stem;
      const both = rule.scope === "both";
      if (rule.mode === "toHalf") {
        if (both || rule.scope === "alnum") s = toHalfAlnum(s);
        if (both || rule.scope === "katakana") s = toHalfKatakana(s);
      } else {
        if (both || rule.scope === "alnum") s = toFullAlnum(s);
        if (both || rule.scope === "katakana") s = toFullKatakana(s);
      }
      return { stem: s, ext };
    }
    case "date": {
      const src =
        rule.source === "exif" ? ctx.input.exifDate ?? ctx.input.lastModified : ctx.input.lastModified;
      const str = fmtDate(src, rule.format || "YYYYMMDD");
      return rule.position === "prefix"
        ? { stem: str + rule.separator + stem, ext }
        : { stem: stem + rule.separator + str, ext };
    }
    case "csvMap": {
      const original = ctx.input.name;
      const originalStem = splitName(original).stem;
      for (const [from, to] of rule.pairs) {
        if (rule.matchBy === "name" && from === original) {
          const sp = splitName(to);
          return { stem: sp.stem, ext: sp.ext || ext };
        }
        if (rule.matchBy === "stem" && from === originalStem) {
          return { stem: to, ext };
        }
      }
      return { stem, ext };
    }
    case "textOverride": {
      const n = rule.names[ctx.index];
      if (n == null || n.trim() === "") return { stem, ext };
      const sp = splitName(n.trim());
      return { stem: sp.stem, ext: sp.ext };
    }
    default:
      return { stem, ext };
  }
}

/** 拡張子も対象にできるルール種別か */
export function supportsIncludeExt(t: RuleType): boolean {
  return t === "insert" || t === "deleteChars" || t === "deleteKeyword" || t === "replace" || t === "caseConv" || t === "widthConv";
}

// ============================================================================
// 全体適用
// ============================================================================

export function computeRows(
  inputs: RenameInput[],
  rules: RenameRule[],
  opts: { dedupe: boolean } = { dedupe: true },
): RenameRow[] {
  const active = rules.filter((r) => r.enabled);
  const rows: RenameRow[] = inputs.map((input, index) => {
    let { stem, ext } = splitName(input.name);
    let error: string | null = null;
    for (const rule of active) {
      try {
        const useFull = "includeExt" in rule && rule.includeExt && supportsIncludeExt(rule.type);
        if (useFull) {
          const res = applyRule(rule, stem + ext, "", { index, input });
          const sp = splitName(res.stem + res.ext);
          stem = sp.stem;
          ext = sp.ext;
        } else {
          ({ stem, ext } = applyRule(rule, stem, ext, { index, input }));
        }
      } catch (e) {
        error = `ルール「${ruleLabel(rule.type)}」でエラー: ${(e as Error).message}`;
        break;
      }
    }
    const newName = (stem + ext).trim();
    return {
      index,
      input,
      newName: newName || input.name,
      changed: newName !== input.name && !!newName,
      collision: false,
      error: error ?? (newName ? null : "空の名前になりました"),
    };
  });

  // 衝突検出（大文字小文字は Windows で同一視）。taken = 既に確定した名前の集合。
  const taken = new Map<string, RenameRow>();
  for (const row of rows) {
    if (row.error) continue;
    const key = row.newName.toLowerCase();
    const first = taken.get(key);
    if (!first) {
      taken.set(key, row);
      continue;
    }
    if (opts.dedupe) {
      const { stem, ext } = splitName(row.newName);
      let n = 2;
      let cand = `${stem}_${n}${ext}`;
      while (taken.has(cand.toLowerCase())) {
        n++;
        cand = `${stem}_${n}${ext}`;
      }
      taken.set(cand.toLowerCase(), row);
      row.newName = cand;
      row.changed = cand !== row.input.name;
    } else {
      row.collision = true;
      first.collision = true;
    }
  }
  return rows;
}

export const RULE_LABELS: Record<RuleType, string> = {
  sequence: "連番の付与",
  insert: "文字列の追加",
  deleteChars: "文字数で削除",
  deleteKeyword: "キーワード削除",
  replace: "文字列の置換",
  ext: "拡張子の変更",
  caseConv: "大文字・小文字",
  widthConv: "全角・半角",
  date: "日付・時刻の付与",
  csvMap: "CSVで対応表リネーム",
  textOverride: "テキストエディタで指定",
};
export function ruleLabel(t: RuleType): string {
  return RULE_LABELS[t] ?? t;
}

let _uid = 0;
export function newRule(type: RuleType): RenameRule {
  const id = `r${Date.now().toString(36)}${(_uid++).toString(36)}`;
  const base = { id, enabled: true };
  switch (type) {
    case "sequence":
      return { ...base, type, position: "suffix", start: 1, step: 1, digits: 3, separator: "_" };
    case "insert":
      return { ...base, type, text: "", position: "prefix", index: 0, includeExt: false };
    case "deleteChars":
      return { ...base, type, from: "start", count: 1, includeExt: false };
    case "deleteKeyword":
      return { ...base, type, keyword: "", all: true, includeExt: false };
    case "replace":
      return { ...base, type, find: "", replaceWith: "", regex: false, all: true, caseInsensitive: false, includeExt: false };
    case "ext":
      return { ...base, type, mode: "lower", value: "" };
    case "caseConv":
      return { ...base, type, mode: "lower", includeExt: false };
    case "widthConv":
      return { ...base, type, mode: "toHalf", scope: "alnum", includeExt: false };
    case "date":
      return { ...base, type, source: "modified", format: "YYYYMMDD", position: "prefix", separator: "_" };
    case "csvMap":
      return { ...base, type, pairs: [], matchBy: "name" };
    case "textOverride":
      return { ...base, type, names: [] };
    default:
      return { ...base, type: "insert", text: "", position: "prefix", index: 0, includeExt: false };
  }
}
