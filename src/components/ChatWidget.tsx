"use client";

import { useEffect, useRef, useState } from "react";
import { Glyph } from "@/components/Glyph";
import { useI18n } from "@/lib/i18n";
import { idbAdd, idbGetAll } from "@/lib/idb";
import { getOwnerId, isMember } from "@/lib/guest";
import { generateText, hasApiKey } from "@/lib/byok";

interface ChatMsg {
  id?: number;
  owner: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
}

const SYSTEM_PROMPT =
  "あなたは MUSOU-EC（楽天・Yahoo・Amazon・Shopify 向けの無料EC支援ツール群）のアシスタントです。" +
  "EC運営（SEO、広告、物流、CVR改善、各モールの規約）について簡潔で実務的な助言を、質問と同じ言語で返してください。";

export function ChatWidget() {
  const { t } = useI18n();
  const [openPanel, setOpenPanel] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyReady, setKeyReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setKeyReady(hasApiKey());
    const owner = getOwnerId();
    idbGetAll<ChatMsg>("chat")
      .then((all) =>
        setMsgs(all.filter((m) => m.owner === owner).sort((a, b) => a.createdAt - b.createdAt)),
      )
      .catch(() => setMsgs([]));
  }, [openPanel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs, openPanel]);

  // モバイルの下部フローティングナビからの開閉トグル
  useEffect(() => {
    const h = () => setOpenPanel((v) => !v);
    window.addEventListener("musou:toggle-chat", h);
    return () => window.removeEventListener("musou:toggle-chat", h);
  }, []);

  async function push(role: ChatMsg["role"], text: string) {
    const m: ChatMsg = { owner: getOwnerId(), role, text, createdAt: Date.now() };
    setMsgs((s) => [...s, m]);
    try {
      await idbAdd("chat", m);
    } catch {
      /* ignore persistence failure */
    }
  }

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    await push("user", q);
    if (!hasApiKey()) {
      await push("assistant", t("chat_needKey"));
      return;
    }
    setBusy(true);
    try {
      const history = [...msgs, { role: "user" as const, text: q }]
        .slice(-8)
        .map((m) => `${m.role === "user" ? "ユーザー" : "アシスタント"}: ${m.text}`)
        .join("\n");
      const reply = await generateText(history, { system: SYSTEM_PROMPT, temperature: 0.6 });
      await push("assistant", reply);
    } catch (e) {
      await push("assistant", `⚠ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* PC はサイドバー上のフローティングボタン。モバイルは下部ナビの「AIチャット」から開く。 */}
      <button
        onClick={() => setOpenPanel((v) => !v)}
        aria-label={t("chat_title")}
        className="fixed right-4 top-4 z-40 hidden items-center gap-1.5 rounded-full border bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-lg lg:inline-flex"
      >
        <Glyph name={openPanel ? "x" : "chat"} size={16} />
        {!openPanel && <span>{t("chat_title")}</span>}
      </button>

      {openPanel && (
        <div className="fixed right-3 top-4 bottom-24 z-50 flex w-[92vw] max-w-sm flex-col overflow-hidden rounded-xl border bg-[var(--surface)] shadow-2xl sm:right-4 lg:top-16 lg:bottom-auto lg:h-[70vh]">
          <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-semibold">
            {t("chat_title")}
            <button onClick={() => setOpenPanel(false)} aria-label="閉じる" className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-soft)]">
              <Glyph name="x" size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            {msgs.length === 0 && <p className="text-[var(--muted)]">{t("chat_empty")}</p>}
            {msgs.map((m, i) => (
              <div
                key={m.id ?? i}
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  m.role === "user"
                    ? "ml-auto bg-[var(--brand)] text-white"
                    : "bg-[var(--surface-soft)]"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ))}
            {busy && <p className="text-[var(--muted)]">…</p>}
          </div>

          <div className="border-t px-3 py-2 text-[11px] text-[var(--muted)]">
            {isMember() ? null : t("chat_guestNote")}
            {!keyReady && <div>{t("chat_needKey")}</div>}
          </div>

          <div className="flex gap-2 border-t p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("chat_placeholder")}
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <button
              onClick={send}
              disabled={busy}
              className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t("chat_send")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
