"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  getApiKey,
  setApiKey,
  getModel,
  setModel,
  DEFAULT_MODEL,
  MODEL_CHOICES,
  generateText,
} from "@/lib/byok";
import { getGuestId, getMemberId, linkGuestToMember, unlinkMember } from "@/lib/guest";
import { Field } from "@/components/ToolShell";
import { Glyph } from "@/components/Glyph";
import { HistoryList } from "@/components/HistoryList";

export default function SettingsPage() {
  const { t } = useI18n();
  const [key, setKey] = useState("");
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [test, setTest] = useState<{ ok?: boolean; msg: string } | null>(null);
  const [guest, setGuest] = useState("");
  const [member, setMember] = useState<string | null>(null);
  const [memberInput, setMemberInput] = useState("");
  const [linkMsg, setLinkMsg] = useState("");

  useEffect(() => {
    setKey(getApiKey());
    setModelState(getModel());
    setGuest(getGuestId());
    setMember(getMemberId());
  }, []);

  function save() {
    setApiKey(key);
    setModel(model);
    setTest({ ok: true, msg: "保存しました。" });
  }

  async function runTest() {
    setTest({ msg: "テスト中…" });
    try {
      setApiKey(key);
      setModel(model);
      const r = await generateText("「接続テスト成功」とだけ返答してください。", { temperature: 0 });
      setTest({ ok: true, msg: r });
    } catch (e) {
      setTest({ ok: false, msg: (e as Error).message });
    }
  }

  async function doLink() {
    const id = memberInput.trim();
    if (!id) return;
    const moved = await linkGuestToMember(id);
    setMember(getMemberId());
    setLinkMsg(`会員ID「${id}」に紐付けました。${moved} 件の履歴を引き継ぎました。`);
  }

  function doUnlink() {
    unlinkMember();
    setMember(null);
    setLinkMsg("ログアウトしました（ゲストに戻りました）。");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("nav_settings")}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          設定はこのブラウザ（localStorage）にのみ保存され、サーバーには送信されません。
        </p>
      </div>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="font-bold">AI（BYOK）</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            AI機能はご自身の無料 API キーを使用します。
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--brand)] underline"
            >
              Google AI Studio
            </a>
            で Gemini API キーを無料取得できます。
          </p>
        </div>
        <Field label="Gemini API キー">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza..."
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field
          label="モデル"
          hint="Gemini はモデルの改廃が速いため、404 が出たら新しいIDに変更してください（一覧: ai.google.dev/gemini-api/docs/models）"
        >
          <input
            list="gemini-models"
            value={model}
            onChange={(e) => setModelState(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <datalist id="gemini-models">
            {MODEL_CHOICES.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        <div className="flex gap-2">
          <button
            onClick={save}
            className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            保存
          </button>
          <button onClick={runTest} className="rounded-md border px-4 py-2 text-sm font-semibold">
            接続テスト
          </button>
        </div>
        {test && (
          <p className="flex items-center gap-1.5 text-sm">
            {test.ok === true && <Glyph name="check" className="text-[#1a8a5a]" />}
            {test.ok === false && <Glyph name="alert" className="text-[#bf0000]" />}
            {test.msg}
          </p>
        )}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-bold">ゲスト・会員連携</h2>
        <p className="text-sm text-[var(--muted)]">
          ゲスト仮ID: <code>{guest}</code>
          <br />
          現在の状態: {member ? `会員（${member}）` : "ゲスト"}
        </p>
        {member ? (
          <button onClick={doUnlink} className="rounded-md border px-4 py-2 text-sm font-semibold">
            ログアウト（モック）
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              placeholder="会員ID（モック）"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <button
              onClick={doLink}
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              紐付け
            </button>
          </div>
        )}
        {linkMsg && <p className="text-sm">{linkMsg}</p>}
        <p className="text-xs text-[var(--muted)]">
          ※ MVP では認証バックエンド未接続のためモック。Supabase 等の実ログイン後に
          <code>linkGuestToMember()</code> を呼べば、チャット・ツール履歴の owner が会員IDへ移送されます。
        </p>
      </section>

      <section id="history" className="card space-y-4 p-5 scroll-mt-24">
        <div>
          <h2 className="font-bold">実行履歴</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            ツールの実行結果はこの端末の IndexedDB に保存されています（owner 単位）。
          </p>
        </div>
        <HistoryList />
      </section>
    </div>
  );
}
