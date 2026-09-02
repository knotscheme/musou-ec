/**
 * BYOK（Bring Your Own Key）。
 * AI 機能はユーザー自身の無料 API キー（既定は Gemini API）を使う。
 * キーはユーザーのブラウザ（localStorage）だけに保存し、サーバーには送らない。
 */

const KEY_STORE = "musou.byok.gemini";
const MODEL_STORE = "musou.byok.model";

/**
 * 既定モデル。Gemini はモデルの入れ替えが速い（例: gemini-2.0-flash 系は
 * 2026-06-01 に廃止）。ユーザーが設定画面で自由に変更できる前提で、
 * 現時点で有効かつドキュメント化されている ID を既定にする。
 */
export const DEFAULT_MODEL = "gemini-2.5-flash";

/** 設定画面のプルダウン候補（2026-09 時点）。 */
export const MODEL_CHOICES = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash",
  "gemini-3-pro",
  "gemini-flash-latest",
];

/** 旧 ID を使っていた場合は既定へ寄せる（廃止済みモデルの 404 回避）。 */
const RETIRED = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro",
]);

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_STORE) ?? "";
}

export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  if (key) localStorage.setItem(KEY_STORE, key.trim());
  else localStorage.removeItem(KEY_STORE);
}

export function getModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  const m = localStorage.getItem(MODEL_STORE) || DEFAULT_MODEL;
  return RETIRED.has(m) ? DEFAULT_MODEL : m;
}

export function setModel(m: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_STORE, m || DEFAULT_MODEL);
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export interface GenerateOptions {
  system?: string;
  temperature?: number;
  signal?: AbortSignal;
}

/**
 * Gemini generateContent をブラウザから直接叩く。
 * ネットワーク以外の中継サーバーを持たない（ゼロコスト）。
 */
export async function generateText(prompt: string, opts: GenerateOptions = {}): Promise<string> {
  const key = getApiKey();
  if (!key) throw new BYOKError("APIキーが未設定です。設定画面で Gemini API キーを登録してください。");
  const model = getModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    key,
  )}`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: opts.temperature ?? 0.7 },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new BYOKError(`Gemini API エラー (${res.status})`, text);
  }
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts;
  const out = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? "").join("") : "";
  if (!out) throw new BYOKError("応答が空でした。プロンプトを見直すか、モデルを変更してください。");
  return out.trim();
}

export class BYOKError extends Error {
  detail?: string;
  constructor(message: string, detail?: string) {
    super(message);
    this.name = "BYOKError";
    this.detail = detail;
  }
}
