/**
 * 読み上げメモ：Web Speech API（speechSynthesis）で端末内の音声を使って読み上げる。
 * メモと設定は localStorage にだけ保存し、外部には送らない。
 */

export interface Memo {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface YomiageSettings {
  voice: string;
  rate: number;
  pitch: number;
  /** メモとメモの間の秒数 */
  gap: number;
  readTitle: boolean;
  loop: boolean;
}

export const DEFAULT_SETTINGS: YomiageSettings = {
  voice: "",
  rate: 1,
  pitch: 1,
  gap: 1,
  readTitle: true,
  loop: false,
};

export const SPEED_PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const MEMO_KEY = "musou.yomiage.memos";
const SETTINGS_KEY = "musou.yomiage.settings";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export const loadMemos = () => read<Memo[]>(MEMO_KEY, []);
export const saveMemos = (memos: Memo[]) => write(MEMO_KEY, memos);
export const loadSettings = (): YomiageSettings => ({ ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY, {}) });
export const saveSettings = (s: YomiageSettings) => write(SETTINGS_KEY, s);

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());

/** 自然に聞こえる声ほど高得点（Edge のニューラル音声 > Google > その他） */
export function voiceScore(v: SpeechSynthesisVoice): number {
  let s = 0;
  if (v.lang.toLowerCase().startsWith("ja")) s += 100;
  if (/natural|neural/i.test(v.name)) s += 50;
  else if (/online/i.test(v.name)) s += 40;
  else if (/google/i.test(v.name)) s += 30;
  if (!v.localService) s += 5;
  return s;
}
export const isNaturalVoice = (v: SpeechSynthesisVoice) => voiceScore(v) >= 130;
export const sortVoices = (voices: SpeechSynthesisVoice[]) =>
  [...voices].sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));

/** 文ごとに区切る：句点で自然に間が入り、途中で倍速を変えても次の文から反映される */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/(?<=[。！？!?\n])/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function memoText(m: Memo, readTitle: boolean): string {
  return (readTitle && m.title ? m.title + "。\n" : "") + m.body;
}

/** 書き出し JSON から有効なメモだけを取り出す（既存 id は除外） */
export function parseImport(json: string, existing: Memo[]): Memo[] {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error("not array");
  const ids = new Set(existing.map((m) => m.id));
  return data.filter(
    (m): m is Memo => !!m && typeof m.id === "string" && typeof m.body === "string" && !ids.has(m.id),
  ).map((m) => ({ ...m, title: m.title ?? "" }));
}
