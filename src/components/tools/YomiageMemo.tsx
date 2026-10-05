"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { Glyph } from "@/components/Glyph";
import { triggerDownload } from "@/lib/csv";
import {
  DEFAULT_SETTINGS,
  SPEED_PRESETS,
  isNaturalVoice,
  loadMemos,
  loadSettings,
  memoText,
  newId,
  parseImport,
  saveMemos,
  saveSettings,
  sortVoices,
  splitSentences,
  type Memo,
  type YomiageSettings,
} from "@/lib/yomiage";

const fmtRate = (r: number) => `${+r.toFixed(2)}倍`;

export default function YomiageMemo() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [settings, setSettings] = useState<YomiageSettings>(DEFAULT_SETTINGS);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [readingId, setReadingId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  // 読み上げ中のコールバックから最新値を参照するための ref
  const settingsRef = useRef(settings);
  const memosRef = useRef(memos);
  const voicesRef = useRef(voices);
  const sessionRef = useRef(0); // 停止・再生のたびに進める。古いコールバックを無効化する
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    memosRef.current = memos;
  }, [memos]);
  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);

  // 初期読み込み（静的書き出しなのでマウント後に localStorage を読む）
  useEffect(() => {
    setMemos(loadMemos());
    setSettings(loadSettings());
    setLoaded(true);
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    const synth = window.speechSynthesis;
    const update = () => setVoices(sortVoices(synth.getVoices()));
    update();
    synth.addEventListener("voiceschanged", update);
    return () => {
      synth.removeEventListener("voiceschanged", update);
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    if (loaded) saveMemos(memos);
  }, [memos, loaded]);
  useEffect(() => {
    if (loaded) saveSettings(settings);
  }, [settings, loaded]);

  // 保存済みの声が無ければ一番自然な声を選ぶ
  const voiceName =
    voices.find((v) => v.name === settings.voice)?.name ?? voices[0]?.name ?? "";
  const hasNatural = voices.some(isNaturalVoice);

  const set = <K extends keyof YomiageSettings>(k: K, v: YomiageSettings[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  // ---------- 読み上げ ----------
  const utter = useCallback((text: string) => {
    const s = settingsRef.current;
    const list = voicesRef.current;
    const u = new SpeechSynthesisUtterance(text);
    const v = list.find((x) => x.name === s.voice) ?? list[0];
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else {
      u.lang = "ja-JP";
    }
    u.rate = s.rate;
    u.pitch = s.pitch;
    return u;
  }, []);

  const speakChunks = useCallback(
    (chunks: string[], session: number, done?: () => void) => {
      let i = 0;
      const step = () => {
        if (sessionRef.current !== session) return;
        if (i >= chunks.length) return done?.();
        const u = utter(chunks[i++]);
        u.onend = step;
        u.onerror = (e) => {
          if (e.error !== "interrupted" && e.error !== "canceled") step();
        };
        window.speechSynthesis.speak(u);
      };
      step();
    },
    [utter],
  );

  const stop = useCallback(() => {
    sessionRef.current++;
    if (gapTimer.current) clearTimeout(gapTimer.current);
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setReadingId(null);
    setPaused(false);
  }, []);

  const playIds = useCallback(
    (ids: string[]) => {
      if (!supported) return;
      stop();
      const session = sessionRef.current;
      let queue = ids.slice();
      const next = () => {
        if (sessionRef.current !== session) return;
        if (!queue.length) {
          if (settingsRef.current.loop && ids.length > 1) queue = ids.slice();
          else return setReadingId(null);
        }
        const id = queue.shift()!;
        const m = memosRef.current.find((x) => x.id === id);
        if (!m) return next();
        setReadingId(id);
        speakChunks(splitSentences(memoText(m, settingsRef.current.readTitle)), session, () => {
          gapTimer.current = setTimeout(next, settingsRef.current.gap * 1000);
        });
      };
      next();
    },
    [speakChunks, stop, supported],
  );

  const preview = () => {
    const text = [title.trim(), body.trim()].filter(Boolean).join("。\n");
    if (!text || !supported) return;
    stop();
    speakChunks(splitSentences(text), sessionRef.current);
  };

  const togglePause = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (synth.paused) {
      synth.resume();
      setPaused(false);
    } else if (synth.speaking) {
      synth.pause();
      setPaused(true);
    }
  };

  // 読み上げ中のメモを画面内へ
  useEffect(() => {
    if (!readingId) return;
    document
      .querySelector(`[data-memo-id="${CSS.escape(readingId)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [readingId]);

  // ---------- 保存・編集 ----------
  const clearEditor = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
  };

  const save = () => {
    const t = title.trim();
    const b = body.trim();
    if (!t && !b) return;
    const now = new Date().toISOString();
    if (editingId) {
      setMemos((ms) => ms.map((m) => (m.id === editingId ? { ...m, title: t, body: b, updatedAt: now } : m)));
    } else {
      setMemos((ms) => [{ id: newId(), title: t, body: b, createdAt: now, updatedAt: now }, ...ms]);
    }
    clearEditor();
  };

  const startEdit = (m: Memo) => {
    setEditingId(m.id);
    setTitle(m.title);
    setBody(m.body);
    window.scrollTo({ top: 0, behavior: "smooth" });
    editorRef.current?.focus();
  };

  const remove = (id: string) => {
    if (!confirm("このメモを削除しますか？")) return;
    if (readingId === id) stop();
    if (editingId === id) clearEditor();
    setMemos((ms) => ms.filter((m) => m.id !== id));
  };

  const move = (id: string, dir: -1 | 1) =>
    setMemos((ms) => {
      const i = ms.findIndex((m) => m.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ms.length) return ms;
      const next = ms.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(memos, null, 2)], { type: "application/json" });
    triggerDownload(blob, `yomiage-memo_${new Date().toISOString().slice(0, 10)}.json`);
  };

  const importJson = async (file: File) => {
    try {
      const added = parseImport(await file.text(), memos);
      setMemos((ms) => [...ms, ...added]);
      alert(`${added.length}件 読み込みました`);
    } catch {
      alert("読み込めないファイルです");
    }
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? memos.filter((m) => `${m.title}\n${m.body}`.toLowerCase().includes(q)) : memos;
  }, [memos, query]);

  const btn = "rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-50";
  const btnPrimary =
    "rounded-md bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50";
  const btnSm = "rounded-md border px-2.5 py-1 text-xs font-semibold";

  return (
    <ToolShell slug="yomiage-memo">
      <div className="card p-4 text-sm text-[var(--muted)]">
        商品説明・接客トーク・台本などを<strong>リストに保存して音声で読み上げ</strong>ます。
        文ごとに区切って読むので自然な間が入り、<strong>倍速は読み上げ中でも次の文から反映</strong>されます。
        メモはこのブラウザ内だけに保存され、外部には送信しません。
      </div>

      {!supported && (
        <div className="card border-[#bf0000] p-4 text-sm text-[#bf0000]">
          このブラウザは読み上げ（Web Speech API）に対応していません。Edge / Chrome で開いてください。
        </div>
      )}

      {/* 入力 */}
      <div className="card space-y-3 p-4">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトル（なくてもOK）"
        />
        <textarea
          ref={editorRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) save();
          }}
          placeholder="読み上げたい文章を入力（Ctrl+Enter で保存）"
          rows={5}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={save} className={btnPrimary} disabled={!title.trim() && !body.trim()}>
            <Glyph name={editingId ? "check" : "plus"} size={14} /> {editingId ? "上書き保存" : "リストに保存"}
          </button>
          <button onClick={preview} className={btn} disabled={!supported || (!title.trim() && !body.trim())}>
            <Glyph name="play" size={14} /> 保存せず読む
          </button>
          {editingId && (
            <button onClick={clearEditor} className={btn}>
              編集をやめる
            </button>
          )}
        </div>
      </div>

      {/* 声・倍速 */}
      <div className="card space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="声"
            hint={
              voices.length === 0
                ? undefined
                : hasNatural
                  ? "★ = 自然な声（ニューラル音声）"
                  : "自然な日本語の声が見つかりません。Microsoft Edge で開くと「Nanami (Natural)」などが使えます。"
            }
          >
            <select
              value={voiceName}
              onChange={(e) => set("voice", e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {isNaturalVoice(v) ? "★ " : ""}
                  {v.name}（{v.lang}）
                </option>
              ))}
            </select>
          </Field>
          <Field label={`倍速：${fmtRate(settings.rate)}`}>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={settings.rate}
              onChange={(e) => set("rate", +e.target.value)}
              className="w-full"
            />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {SPEED_PRESETS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    set("rate", r);
                  }}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    Math.abs(settings.rate - r) < 0.001 ? "border-[var(--brand)] bg-[var(--brand)] text-white" : ""
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>
          </Field>
          <Field label={`声の高さ：${settings.pitch.toFixed(1)}`}>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={settings.pitch}
              onChange={(e) => set("pitch", +e.target.value)}
              className="w-full"
            />
          </Field>
          <Field label={`メモ間の間隔：${settings.gap}秒`}>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={settings.gap}
              onChange={(e) => set("gap", +e.target.value)}
              className="w-full"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.readTitle} onChange={(e) => set("readTitle", e.target.checked)} />
            タイトルも読む
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.loop} onChange={(e) => set("loop", e.target.checked)} />
            全部読んだら最初から
          </label>
        </div>
      </div>

      {/* リスト */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => playIds(memos.map((m) => m.id))}
            className={btnPrimary}
            disabled={!supported || memos.length === 0}
          >
            <Glyph name="play" size={14} /> 全部読む
          </button>
          <button onClick={togglePause} className={btn} disabled={!readingId}>
            {paused ? "再開" : "一時停止"}
          </button>
          <button onClick={stop} className={btn} disabled={!readingId}>
            停止
          </button>
          <span className="ml-auto text-xs text-[var(--muted)]">
            {memos.length}件{query.trim() ? `（表示 ${shown.length}件）` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[160px] flex-1">
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="検索" />
          </div>
          <button onClick={exportJson} className={btnSm} disabled={memos.length === 0}>
            <Glyph name="download" size={12} /> 書き出し
          </button>
          <button onClick={() => fileRef.current?.click()} className={btnSm}>
            <Glyph name="upload" size={12} /> 読み込み
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
        </div>

        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            {memos.length ? "該当するメモがありません" : "まだメモがありません。上で入力して「リストに保存」"}
          </p>
        ) : (
          <ul className="space-y-2">
            {shown.map((m) => {
              const reading = m.id === readingId;
              return (
                <li
                  key={m.id}
                  data-memo-id={m.id}
                  className="rounded-lg border p-3 transition-colors"
                  style={
                    reading
                      ? { borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 10%, transparent)" }
                      : undefined
                  }
                >
                  {m.title && <div className="font-semibold">{m.title}</div>}
                  <div className="mt-0.5 whitespace-pre-wrap break-words text-sm">{m.body}</div>
                  <div className="mt-1.5 text-[11px] text-[var(--muted)]">
                    {new Date(m.updatedAt).toLocaleString("ja-JP")}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => playIds([m.id])}
                      className="rounded-md bg-[var(--brand)] px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={!supported}
                    >
                      <Glyph name="play" size={12} /> 読む
                    </button>
                    <button
                      onClick={() => playIds(memos.slice(memos.findIndex((x) => x.id === m.id)).map((x) => x.id))}
                      className={btnSm}
                      disabled={!supported}
                    >
                      ここから全部
                    </button>
                    <button onClick={() => startEdit(m)} className={btnSm}>
                      <Glyph name="pencil" size={12} /> 編集
                    </button>
                    <button onClick={() => move(m.id, -1)} className={btnSm} aria-label="上へ">
                      ↑
                    </button>
                    <button onClick={() => move(m.id, 1)} className={btnSm} aria-label="下へ">
                      ↓
                    </button>
                    <button onClick={() => remove(m.id)} className={`${btnSm} text-[#bf0000]`}>
                      削除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ToolShell>
  );
}
