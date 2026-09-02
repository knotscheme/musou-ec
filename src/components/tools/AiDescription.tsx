"use client";

import { useState } from "react";
import Link from "next/link";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { CopyBox } from "@/components/CopyBox";
import { generateText, hasApiKey, getModel } from "@/lib/byok";
import { recordHistory } from "@/lib/history";

type Format = "rakuten" | "amazon" | "shopify" | "plain";
const FORMAT_LABEL: Record<Format, string> = {
  rakuten: "楽天（キャッチコピー＋説明文）",
  amazon: "Amazon（箇条書き5点＋説明）",
  shopify: "自社サイト（ストーリー性のある説明）",
  plain: "汎用（プレーンな説明文）",
};

export default function AiDescription() {
  const [name, setName] = useState("");
  const [features, setFeatures] = useState("");
  const [target, setTarget] = useState("");
  const [tone, setTone] = useState("信頼感のある丁寧な");
  const [format, setFormat] = useState<Format>("rakuten");
  const [length, setLength] = useState(400);
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const keyReady = typeof window !== "undefined" && hasApiKey();

  async function run() {
    setErr("");
    setOut("");
    if (!name.trim()) {
      setErr("商品名を入力してください。");
      return;
    }
    setBusy(true);
    const formatInstruction: Record<Format, string> = {
      rakuten:
        "出力は「【キャッチコピー】」（30文字前後、記号は控えめ）と「【商品説明】」の2ブロック。楽天の商品ページを想定。",
      amazon:
        "出力は「【商品説明（要約）】」（2〜3文）と「【箇条書き】」5点。各箇条書きはベネフィット→仕様の順、80文字以内。",
      shopify:
        "自社ECを想定し、ブランドの世界観・使用シーン・こだわりが伝わるストーリー性のある説明文。見出しは不要。",
      plain: "装飾や見出しなしのプレーンな説明文のみ。",
    };
    const prompt = [
      `次の商品の説明文を日本語で作成してください。`,
      `商品名: ${name}`,
      features.trim() ? `特徴:\n${features}` : "",
      target.trim() ? `ターゲット: ${target}` : "",
      `トーン: ${tone}`,
      `目安の文字数: ${length}字程度`,
      formatInstruction[format],
      `景品表示法・薬機法に触れる断定的な効果効能表現、誇大表現、根拠のない最上級表現は使わないこと。`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const text = await generateText(prompt, { temperature: 0.75 });
      setOut(text);
      recordHistory("ai-description", `${FORMAT_LABEL[format]}を生成`, `${name} / ${getModel()}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell slug="ai-description">
      {!keyReady && (
        <div className="rounded-lg border-2 p-3 text-sm" style={{ borderColor: "#a1701c" }}>
          AI機能を使うには、
          <Link href="/settings/" className="mx-1 font-semibold text-[var(--brand)] underline">
            設定画面
          </Link>
          で Gemini API キーを登録してください（1回登録すれば全ツール共通で使えます）。
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="商品名">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="ターゲット（任意）">
          <TextInput value={target} onChange={(e) => setTarget(e.target.value)} placeholder="例）30代・アウトドア初心者" />
        </Field>
      </div>
      <Field label="特徴・仕様（箇条書きで複数行）">
        <textarea
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          rows={5}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder={"・重量900g / 折りたたみ可\n・耐荷重120kg\n・収納袋つき"}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="出力フォーマット">
          <select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="w-full rounded-md border px-3 py-2 text-sm">
            {(Object.keys(FORMAT_LABEL) as Format[]).map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="トーン">
          <TextInput value={tone} onChange={(e) => setTone(e.target.value)} />
        </Field>
        <Field label="文字数の目安">
          <TextInput type="number" value={length} onChange={(e) => setLength(+e.target.value)} />
        </Field>
      </div>

      <button
        onClick={run}
        disabled={busy || !keyReady}
        className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "生成中…" : "説明文を生成"}
      </button>

      {err && <p className="text-sm" style={{ color: "#bf0000" }}>⚠ {err}</p>}
      {out && <CopyBox title="生成結果" text={out} rows={14} />}

      <p className="text-xs text-[var(--muted)]">
        生成にはあなたの API キーが使われ、リクエストはブラウザから Gemini へ直接送信されます（当サイトのサーバーは経由しません）。
        出力は必ず内容を確認し、必要に応じて
        <Link href="/tools/ng-word-checker/" className="mx-1 text-[var(--brand)] underline">
          NGワードチェッカー
        </Link>
        で確認してください。
      </p>
    </ToolShell>
  );
}
