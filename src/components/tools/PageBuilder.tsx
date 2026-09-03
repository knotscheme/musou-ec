"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import JSZip from "jszip";
import { fileToDataUrl } from "@/lib/imgfile";
import { Glyph } from "@/components/Glyph";
import { ToolShell, Field, TextInput } from "@/components/ToolShell";
import { ToolIcon } from "@/components/ToolIcon";
import { triggerDownload } from "@/lib/csv";
import { idbGet, idbPut } from "@/lib/idb";
import { recordHistory } from "@/lib/history";
import { listLPs, getLP, saveLP, deleteLP, duplicateLP, type SavedLP } from "@/lib/pagebuilderStore";
import {
  BLOCK_LABEL,
  BLOCK_SHORT,
  BLOCK_GROUP,
  BLOCK_DEFAULT,
  TEMPLATES,
  FONTS,
  THEME_COLORS,
  DEFAULT_THEME,
  buildInlineHtml,
  buildFullHtml,
  buildCss,
  type Block,
  type BlockType,
  type Visibility,
  type Theme,
  type FontKey,
  type RadiusKey,
  type HeadingStyle,
} from "@/lib/pagebuilder";

const rid = () => Math.random().toString(36).slice(2, 9);
type Mode = "structure" | "design" | "edit";

/** プレビュー内のリンククリックを無効化（誤ってアプリ本体に遷移するのを防ぐ）。書き出しHTMLには含めない。 */
const PREVIEW_GUARD =
  "<style>.mu-wrap a{cursor:default}</style>" +
  "<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a){e.preventDefault();e.stopPropagation();}},true);</script>";

function hexRgba(hex: string, pct: number): string {
  const m = (hex || "#6d28d9").replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) || 0;
  const g = parseInt(m.slice(2, 4), 16) || 0;
  const b = parseInt(m.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(100, pct)) / 100})`;
}

/** プレビューのセクションをクリックで選択・ドラッグで並び替え。親と postMessage で連携。 */
function previewSelectScript(color: string, opacity: number): string {
  const hover = hexRgba(color, opacity);
  return (
    "<style>" +
    "[data-mu-block]{position:relative;cursor:grab}" +
    `[data-mu-block]:hover{outline:2px dashed ${hover};outline-offset:-2px}` +
    `[data-mu-block].mu-sel{outline:3px solid ${color};outline-offset:-3px;background:${hexRgba(color, Math.min(opacity, 14))}}` +
    `[data-mu-block]:hover::after{content:"\\2059 ドラッグで並び替え / クリックで選択";position:absolute;top:2px;left:2px;z-index:99999;background:${color};color:#fff;font:600 10px/1.4 sans-serif;padding:2px 7px;border-radius:5px;pointer-events:none;white-space:nowrap}` +
    "body.mu-dragging [data-mu-block]:hover{outline:none}body.mu-dragging [data-mu-block]:hover::after{display:none}" +
    "[data-mu-block]{transition:opacity .2s}[data-mu-block].mu-drag{opacity:.28}" +
    // セクション間に差し込む挿入バー（実要素なので隙間が空いてラインが見える）
    `.mu-dropline{height:6px;background:${color};margin:16px 14px;border-radius:3px;box-shadow:0 0 0 2px #fff,0 3px 12px ${hexRgba(color, 55)};pointer-events:none}` +
    "</style>" +
    "<script>(function(){var dragId=null,curIdx=-1;" +
    "var line=document.createElement('div');line.className='mu-dropline';" +
    "function removeLine(){if(line.parentNode)line.parentNode.removeChild(line);curIdx=-1;}" +
    "function siblings(){return [].slice.call(document.querySelectorAll('.mu-wrap>[data-mu-block]')).filter(function(el){return !el.classList.contains('mu-drag');});}" +
    // カーソルYから挿入位置(0..N)を決める。要素の中点を超えたら次へ＝境界での往復（連打）を防止
    "function wantIdx(y){var els=siblings();for(var i=0;i<els.length;i++){var r=els[i].getBoundingClientRect();if(y<r.top+r.height/2)return i;}return els.length;}" +
    "function flipMove(idx){var els=[].slice.call(document.querySelectorAll('.mu-wrap>[data-mu-block]'));var first=els.map(function(el){return el.getBoundingClientRect();});var sib=siblings();var ref=sib[idx]||null;var wrap=document.querySelector('.mu-wrap');var fromEl=document.querySelector('.mu-drag');wrap.insertBefore(fromEl,ref);els.forEach(function(el,i){var last=el.getBoundingClientRect();var dy=first[i].top-last.top;if(!dy)return;el.style.transition='none';el.style.transform='translateY('+dy+'px)';requestAnimationFrame(function(){requestAnimationFrame(function(){el.style.transition='transform .38s cubic-bezier(.2,.8,.2,1)';el.style.transform='';setTimeout(function(){el.style.transition='';el.style.transform='';},440);});});});return idx;}" +
    "document.addEventListener('click',function(e){var w=e.target.closest&&e.target.closest('[data-mu-block]');if(w){e.preventDefault();e.stopPropagation();parent.postMessage({mu:'select',id:w.getAttribute('data-mu-block')},'*');}},true);" +
    "document.addEventListener('dragstart',function(e){var w=e.target.closest&&e.target.closest('[data-mu-block]');if(!w)return;dragId=w.getAttribute('data-mu-block');w.classList.add('mu-drag');document.body.classList.add('mu-dragging');try{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);e.dataTransfer.setDragImage(w,24,20);}catch(x){}});" +
    "document.addEventListener('dragover',function(e){if(!dragId)return;e.preventDefault();var idx=wantIdx(e.clientY);if(idx===curIdx)return;curIdx=idx;var sib=siblings();var ref=sib[idx]||null;var wrap=document.querySelector('.mu-wrap');wrap.insertBefore(line,ref);});" +
    "document.addEventListener('drop',function(e){if(!dragId)return;e.preventDefault();removeLine();var idx=wantIdx(e.clientY);var sib=siblings();var toEl=sib[idx]||sib[sib.length-1];if(toEl){flipMove(idx);parent.postMessage({mu:'reorder',from:dragId,to:toEl.getAttribute('data-mu-block'),after:!sib[idx],local:true},'*');}});" +
    "document.addEventListener('dragend',function(){removeLine();document.querySelectorAll('.mu-drag').forEach(function(x){x.classList.remove('mu-drag')});document.body.classList.remove('mu-dragging');dragId=null;});" +
    "window.addEventListener('message',function(ev){if(!ev.data||ev.data.mu!=='highlight')return;document.querySelectorAll('.mu-sel').forEach(function(x){x.classList.remove('mu-sel')});if(!ev.data.id)return;var t=document.querySelector('[data-mu-block=\"'+ev.data.id+'\"]');if(!t)return;t.classList.add('mu-sel');" +
    // scroll:true のときだけ、しかも iframe 内スクロールだけ動かす（scrollIntoView は親ページごと動くので使わない）
    "if(ev.data.scroll){var r=t.getBoundingClientRect();var y=r.top+window.pageYOffset-(window.innerHeight-r.height)/2;window.scrollTo({top:Math.max(0,y),behavior:ev.data.smooth===false?'auto':'smooth'});}});" +
    "})();</script>"
  );
}
const previewDoc = (
  html: string,
  selectable = false,
  guide: { color: string; opacity: number } = { color: "#6d28d9", opacity: 55 },
) => html + PREVIEW_GUARD + (selectable ? previewSelectScript(guide.color, guide.opacity) : "");

// ── (?) ヘルプ ──
function Help({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-[10px] font-bold text-[var(--muted)]">
        ?
      </span>
      <span className="pointer-events-none absolute left-0 top-5 z-30 hidden w-60 rounded-md border bg-[var(--surface)] p-2.5 text-[11px] font-normal leading-relaxed text-[var(--foreground)] shadow-xl group-hover:block">
        {text}
      </span>
    </span>
  );
}

// ── カラー値のパース/合成（透明度対応） ──
function parseColor(v: string): { hex: string; a: number } {
  if (!v || v === "transparent") return { hex: "#000000", a: v === "transparent" ? 0 : 100 };
  const h8 = v.match(/^#([0-9a-fA-F]{8})$/);
  if (h8) return { hex: "#" + h8[1].slice(0, 6).toLowerCase(), a: Math.round((parseInt(h8[1].slice(6), 16) / 255) * 100) };
  const rgba = v.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/i);
  if (rgba) {
    const to2 = (n: string) => (+n).toString(16).padStart(2, "0");
    return {
      hex: "#" + to2(rgba[1]) + to2(rgba[2]) + to2(rgba[3]),
      a: rgba[4] != null ? Math.round(parseFloat(rgba[4]) * 100) : 100,
    };
  }
  return { hex: /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : "#000000", a: 100 };
}
function composeColor(hex: string, a: number): string {
  if (a >= 100) return hex;
  if (a <= 0) return "transparent";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${(a / 100).toFixed(2)})`;
}

// ── カラー入力（透明度スライダー付き）。onClear があれば「テーマ色」に戻せる。 ──
function ColorAlpha({
  label,
  value,
  fallback,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  fallback?: string;
  onChange: (v: string) => void;
  onClear?: () => void;
}) {
  const isTheme = onClear != null && (value == null || value === "");
  const { hex, a } = parseColor(isTheme ? fallback || "#000000" : value || "#000000");
  return (
    <label className="block text-xs">
      <span className="mb-0.5 block text-[var(--muted)]">{label}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(composeColor(e.target.value, a))}
          className="h-8 w-11 rounded border"
        />
        <input
          type="range"
          min={0}
          max={100}
          value={a}
          onChange={(e) => onChange(composeColor(hex, +e.target.value))}
          title={`不透明度 ${a}%`}
          className="w-14"
        />
        <span className="w-8 tabular-nums text-[10px] text-[var(--muted)]">{a}%</span>
        <button
          onClick={() => onChange("transparent")}
          className="rounded border px-1.5 py-0.5 text-[10px]"
          title="完全に透明"
        >
          透明
        </button>
        {onClear &&
          (isTheme ? (
            <span className="text-[10px] text-[var(--muted)]">テーマ色</span>
          ) : (
            <button onClick={onClear} className="text-[10px] text-[var(--brand)] underline">
              テーマ色に戻す
            </button>
          ))}
      </span>
    </label>
  );
}

// 後方互換エイリアス
function ColorField(props: {
  label: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  return <ColorAlpha {...props} />;
}

// ── 画像URL入力 ＋ ドラッグ&ドロップ / ファイル選択 ──
function ImageDrop({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const isData = value.startsWith("data:");

  async function take(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToDataUrl(file));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <input
        value={isData ? "" : value}
        placeholder="画像URL / ファイル名"
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border px-2 py-1 text-sm"
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={`flex items-center gap-2 rounded-md border border-dashed px-2 py-2 text-[11px] ${
          over ? "border-[var(--brand)] bg-[var(--surface-soft)]" : "text-[var(--muted)]"
        }`}
      >
        {isData || value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={isData ? value : undefined} alt="" className="h-9 w-9 rounded object-cover" style={{ background: "#eee" }} />
        ) : null}
        <span className="flex-1">
          {busy ? "取り込み中…" : isData ? "画像を取り込み済み（データURL）" : "ここに画像をドロップ、または"}
        </span>
        <label className="cursor-pointer rounded border px-2 py-0.5 font-semibold">
          ファイル選択
          <input type="file" accept="image/*" className="hidden" onChange={(e) => take(e.target.files?.[0])} />
        </label>
        {value && (
          <button onClick={() => onChange("")} className="rounded border px-1.5 py-0.5">
            消去
          </button>
        )}
      </div>
      {isData && (
        <p className="text-[10px] text-[var(--muted)]">
          ※ データURLはHTMLが大きくなります。多数の画像は、サーバーにアップした画像URLの指定を推奨します。
        </p>
      )}
    </div>
  );
}

// ── 複数画像を持つブロック（スライド/アイコン/ギャラリー/ロゴ/商品）の行エディタ ──
// 内部表現は「1行 = a|b|c…」の文字列のまま。行ごとに画像はドロップ/選択/URLで指定できる。
type RowCol = { label: string; image?: boolean };

function RowsEditor({
  value,
  onChange,
  columns,
  addLabel = "行を追加",
}: {
  value: string;
  onChange: (v: string) => void;
  columns: RowCol[];
  addLabel?: string;
}) {
  const [textMode, setTextMode] = useState(false);
  const parsed = (value ?? "").split(/\r?\n/).map((l) => l.split("|"));
  const rows: string[][] = parsed.length ? parsed : [columns.map(() => "")];

  const serialize = (r: string[][]) =>
    r
      .map((cells) => columns.map((_, i) => (cells[i] ?? "").replace(/\r?\n/g, " ").trim()).join("|"))
      .filter((line) => line.replace(/\|/g, "").trim() !== "")
      .join("\n");

  const setCell = (ri: number, ci: number, v: string) => {
    const next = rows.map((r) => [...r]);
    while (next[ri].length < columns.length) next[ri].push("");
    next[ri][ci] = v;
    onChange(serialize(next));
  };
  const addRow = () => onChange(serialize([...rows, columns.map(() => "")]));
  const delRow = (ri: number) => onChange(serialize(rows.filter((_, i) => i !== ri)));
  const moveRow = (ri: number, dir: -1 | 1) => {
    const j = ri + dir;
    if (j < 0 || j >= rows.length) return;
    const next = rows.map((r) => [...r]);
    [next[ri], next[j]] = [next[j], next[ri]];
    onChange(serialize(next));
  };

  if (textMode) {
    return (
      <div className="space-y-1 sm:col-span-2">
        <div className="flex justify-end">
          <button onClick={() => setTextMode(false)} className="text-[11px] text-[var(--brand)]">
            ← 通常の編集に戻る
          </button>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.max(3, rows.length + 1)}
          className="w-full rounded border px-2 py-1 font-mono text-xs"
        />
        <p className="text-[10px] text-[var(--muted)]">1行 = {columns.map((c) => c.label).join(" | ")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      {rows.map((cells, ri) => (
        <div key={ri} className="rounded-md border p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--muted)]">{ri + 1}</span>
            <span className="flex gap-1">
              <button onClick={() => moveRow(ri, -1)} disabled={ri === 0} className="rounded border px-1 py-0.5 text-xs disabled:opacity-30" title="上へ">
                <Glyph name="arrowUp" size={11} />
              </button>
              <button onClick={() => moveRow(ri, 1)} disabled={ri === rows.length - 1} className="rounded border px-1 py-0.5 text-xs disabled:opacity-30" title="下へ">
                <Glyph name="arrowDown" size={11} />
              </button>
              <button onClick={() => delRow(ri)} className="rounded border px-1 py-0.5 text-xs text-[#bf0000]" title="削除">
                <Glyph name="x" size={11} />
              </button>
            </span>
          </div>
          <div className="grid gap-1.5">
            {columns.map((col, ci) => (
              <label key={ci} className="block text-xs">
                <span className="mb-0.5 block text-[var(--muted)]">{col.label}</span>
                {col.image ? (
                  <ImageDrop value={cells[ci] ?? ""} onChange={(v) => setCell(ri, ci, v)} />
                ) : (
                  <input
                    value={cells[ci] ?? ""}
                    onChange={(e) => setCell(ri, ci, e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button onClick={addRow} className="rounded-md border px-3 py-1.5 text-xs font-semibold">
          ＋ {addLabel}
        </button>
        <button onClick={() => setTextMode(true)} className="text-[11px] text-[var(--muted)] underline">
          テキストで一括編集
        </button>
      </div>
    </div>
  );
}

// ── リスト表示のチップ（カーソルを2秒合わせるとプレビューを表示） ──
function BlockChip({
  bt,
  theme,
  baseUrl,
  target,
  onAdd,
}: {
  bt: BlockType;
  theme: Theme;
  baseUrl: string;
  target: "rakuten" | "yahoo";
  onAdd: (t: BlockType) => void;
}) {
  const [show, setShow] = useState(false);
  const timer = useRef<number | null>(null);
  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  // ほぼ即時。素早くチップ間を移動したときのチラつきだけ抑える短い猶予。
  const arm = () => {
    clear();
    timer.current = window.setTimeout(() => setShow(true), 120);
  };
  const disarm = () => {
    clear();
    setShow(false);
  };
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div className="relative" onMouseEnter={arm} onMouseLeave={disarm}>
      <button
        onClick={() => onAdd(bt)}
        className="rounded-full border px-3 py-1.5 text-xs leading-none hover:bg-[var(--surface-soft)]"
      >
        {BLOCK_LABEL[bt]}
      </button>
      {show && (
        // pt-2 が透明の「橋」。ボタンとカードの間にすき間を作らずホバーを維持する
        <div className="absolute left-1/2 top-full z-40 -translate-x-1/2 pt-2">
          <div className="w-[min(300px,calc(100vw-1.5rem))] overflow-hidden rounded-lg border bg-white shadow-xl">
            <iframe
              title={`preview-${bt}`}
              sandbox=""
              tabIndex={-1}
              srcDoc={buildInlineHtml(
                [{ id: bt, type: bt, props: { ...BLOCK_DEFAULT[bt] } }],
                { title: "", baseUrl, target, theme },
              )}
              style={{ width: "100%", height: 260, border: 0, display: "block", background: "#fff" }}
            />
            <div className="border-t px-2 py-1 text-[11px] font-medium text-[var(--muted)]">
              {BLOCK_LABEL[bt]} ・ クリックで追加
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ブロック追加ギャラリー（プレビュー付き） ──
function BlockGallery({
  theme,
  baseUrl,
  target,
  onAdd,
}: {
  theme: Theme;
  baseUrl: string;
  target: "rakuten" | "yahoo";
  onAdd: (t: BlockType) => void;
}) {
  return (
    <div className="mt-3 space-y-4">
      {BLOCK_GROUP.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 text-[11px] font-semibold text-[var(--muted)]">{g.label}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {g.types.map((bt) => (
              <button
                key={bt}
                onClick={() => onAdd(bt)}
                className="card group overflow-hidden p-0 text-left transition hover:ring-2 hover:ring-[var(--brand)]"
                title={`「${BLOCK_LABEL[bt]}」を追加`}
              >
                <div className="pointer-events-none h-28 overflow-hidden border-b bg-white">
                  <iframe
                    title={bt}
                    sandbox=""
                    srcDoc={buildInlineHtml(
                      [{ id: bt, type: bt, props: { ...BLOCK_DEFAULT[bt] } }],
                      { title: "", baseUrl, target, theme },
                    )}
                    style={{ width: "230%", height: 460, border: 0, transform: "scale(0.43)", transformOrigin: "top left" }}
                  />
                </div>
                <div className="flex items-center justify-between px-2 py-1.5 text-xs font-medium">
                  <span>{BLOCK_SHORT[bt]}</span>
                  <span className="text-[var(--brand)] opacity-0 group-hover:opacity-100">＋追加</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PageBuilder({ target }: { target: "rakuten" | "yahoo" }) {
  const slug = target === "rakuten" ? "rakuten-page-builder" : "yahoo-page-builder";
  const storeKey = `pagebuilder:${target}`;

  const [mode, setMode] = useState<Mode>("structure");
  const [pendingTpl, setPendingTpl] = useState<number | null>(0);
  const [previewTpl, setPreviewTpl] = useState<number | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [selId, setSelId] = useState<string | null>(null);

  // 元に戻す / やり直す（blocks の履歴）
  const [past, setPast] = useState<Block[][]>([]);
  const [future, setFuture] = useState<Block[][]>([]);
  const skipHist = useRef(false);
  const prevBlocks = useRef<Block[]>(blocks);
  useEffect(() => {
    if (skipHist.current) {
      skipHist.current = false;
      prevBlocks.current = blocks;
      return;
    }
    if (prevBlocks.current !== blocks) {
      const snap = prevBlocks.current;
      setPast((p) => [...p, snap].slice(-60));
      setFuture([]);
    }
    prevBlocks.current = blocks;
  }, [blocks]);
  function undo() {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setFuture((f) => [...f, blocks]);
    setPast((p) => p.slice(0, -1));
    skipHist.current = true;
    setBlocks(prev);
    setSelId(null);
  }
  function redo() {
    if (!future.length) return;
    const next = future[future.length - 1];
    setPast((p) => [...p, blocks]);
    setFuture((f) => f.slice(0, -1));
    skipHist.current = true;
    setBlocks(next);
    setSelId(null);
  }
  const [showDesign, setShowDesign] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [guideColor, setGuideColor] = useState("#6d28d9");
  const [guideOpacity, setGuideOpacity] = useState(55);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("musou.pb.guide");
      if (raw) {
        const g = JSON.parse(raw);
        if (g.color) setGuideColor(g.color);
        if (typeof g.opacity === "number") setGuideOpacity(g.opacity);
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("musou.pb.guide", JSON.stringify({ color: guideColor, opacity: guideOpacity }));
    } catch {
      /* ignore */
    }
  }, [guideColor, guideOpacity]);
  const [title, setTitle] = useState(
    target === "rakuten" ? "楽天GOLD トップページ" : "Yahoo!ストア トップページ",
  );
  const [baseUrl, setBaseUrl] = useState("");
  const [pw, setPw] = useState(390);
  const [msg, setMsg] = useState("");
  const [recovered, setRecovered] = useState<
    { blocks: Block[]; title: string; baseUrl: string; theme: Theme; savedAt: number } | null
  >(null);
  const [loaded, setLoaded] = useState(false);

  // ── LP保存リスト（名前付きで複数保存） ──
  const [lps, setLps] = useState<SavedLP[]>([]);
  const [docId, setDocId] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const refreshLps = useCallback(() => {
    listLPs(target).then(setLps).catch(() => {});
  }, [target]);
  useEffect(() => {
    refreshLps();
  }, [refreshLps]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // 前回の編集内容があれば復元候補として保持（自動では開かない）
  useEffect(() => {
    idbGet<{
      key: string;
      value: { blocks: Block[]; title: string; baseUrl: string; theme?: Theme; savedAt?: number };
    }>("kv", storeKey)
      .then((row) => {
        if (row?.value?.blocks?.length) {
          setRecovered({
            blocks: row.value.blocks,
            title: row.value.title || title,
            baseUrl: row.value.baseUrl || "",
            theme: row.value.theme || DEFAULT_THEME,
            savedAt: row.value.savedAt || 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  // 編集中は自動保存（デバウンス）。復旧スロット＋（開いている場合は）名前付きLPの両方を更新。
  useEffect(() => {
    if (mode !== "edit" || !loaded) return;
    const timer = setTimeout(() => {
      idbPut("kv", {
        key: storeKey,
        value: { blocks, title, baseUrl, theme, savedAt: Date.now() },
      }).catch(() => {});
      if (docId) {
        saveLP({ id: docId, name: docName, target, blocks, title, baseUrl, theme })
          .then(() => refreshLps())
          .catch(() => {});
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [mode, loaded, blocks, title, baseUrl, theme, storeKey, docId, docName, target, refreshLps]);

  // ?lp=<id> で保存済みLPを直接開く（マイページ等からのリンク）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("lp");
    if (!id) return;
    getLP(id)
      .then((lp) => {
        if (!lp) return;
        skipHist.current = true;
        setBlocks(lp.blocks);
        setTitle(lp.title);
        setBaseUrl(lp.baseUrl || "");
        setTheme(lp.theme || DEFAULT_THEME);
        setDocId(lp.id);
        setDocName(lp.name);
        setRecovered(null);
        setMode("edit");
      })
      .catch(() => {});
    // 初回のみ
  }, []);

  function openLP(lp: SavedLP) {
    skipHist.current = true;
    setBlocks(lp.blocks);
    setTitle(lp.title);
    setBaseUrl(lp.baseUrl || "");
    setTheme(lp.theme || DEFAULT_THEME);
    setPast([]);
    setFuture([]);
    setDocId(lp.id);
    setDocName(lp.name);
    setRecovered(null);
    setMode("edit");
  }

  async function saveNamed(asNew: boolean) {
    const suggested = asNew ? "" : docName || title || "無題のLP";
    const name = window.prompt(asNew ? "新しい名前で保存します。LP名を入力してください。" : "LP名", suggested);
    if (name == null) return;
    try {
      const doc = await saveLP({
        id: asNew ? undefined : docId ?? undefined,
        name: name.trim() || suggested || "無題のLP",
        target,
        blocks,
        title,
        baseUrl,
        theme,
      });
      setDocId(doc.id);
      setDocName(doc.name);
      refreshLps();
      setMsg(`「${doc.name}」を保存リストに保存しました。`);
    } catch {
      setMsg("保存に失敗しました（ブラウザの空き容量をご確認ください）。");
    }
  }

  async function removeLP(id: string, name: string) {
    if (!confirm(`保存リストから「${name}」を削除します。よろしいですか？`)) return;
    await deleteLP(id);
    if (docId === id) {
      setDocId(null);
      setDocName("");
    }
    refreshLps();
  }

  async function copyLP(id: string) {
    await duplicateLP(id);
    refreshLps();
  }

  function restoreDraft() {
    if (!recovered) return;
    setBlocks(recovered.blocks);
    setTitle(recovered.title);
    setBaseUrl(recovered.baseUrl);
    setTheme(recovered.theme);
    setDocId(null);
    setDocName("");
    setRecovered(null);
    setMode("edit");
  }
  function discardDraft() {
    if (!confirm("保存されている前回の編集内容を削除します。よろしいですか？")) return;
    idbPut("kv", { key: storeKey, value: { blocks: [], title, baseUrl, theme, savedAt: Date.now() } }).catch(() => {});
    setRecovered(null);
  }

  const opts = { title, baseUrl, target, theme };
  const inlineHtml = useMemo(
    () => buildInlineHtml(blocks, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blocks, title, baseUrl, target, theme],
  );
  // 編集プレビュー用（各セクションを data-mu-block でラップ）
  const previewHtml = useMemo(
    () => buildInlineHtml(blocks, { ...opts, wrap: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blocks, title, baseUrl, target, theme],
  );
  const previewRef = useRef<HTMLIFrameElement>(null);

  // プレビュー枠の実寸を測り、選択中の端末幅(pw)がはみ出すときだけ縮小して中央に収める。
  // 縮小は CSS transform ではなく zoom（Chromium は再レイアウトするので文字がボケない）。
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(0);
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWrapW(e.contentRect.width);
    });
    ro.observe(el);
    // clientWidth はパディング込みなので p-3（左右24px）を引いて中身の実幅に合わせる
    setWrapW(Math.max(0, el.clientWidth - 24));
    return () => ro.disconnect();
  }, [mode]);
  // 枠に収まらない分だけ zoom で縮小（Chromium は再レイアウトするので文字がボケない）
  const previewZoom = wrapW > 0 && wrapW < pw ? Math.max(0.3, +(wrapW / pw).toFixed(3)) : 1;

  // iframe に渡す srcDoc。プレビュー内でのドラッグ並び替え（local:true）のときだけ
  // 再読み込みを抑止して、iframe 側の FLIP アニメーションをそのまま活かす。
  const iframeDoc = useMemo(
    () => previewDoc(previewHtml, true, { color: guideColor, opacity: guideOpacity }),
    [previewHtml, guideColor, guideOpacity],
  );

  // プレビュー ⇄ 編集：クリック選択・ドラッグ並び替え
  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const d = ev.data;
      if (!d || typeof d !== "object") return;
      if (d.mu === "select" && typeof d.id === "string") {
        setSelId(d.id);
        document.getElementById(`beditor-${d.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      } else if (d.mu === "reorder" && typeof d.from === "string" && typeof d.to === "string") {
        const apply = () =>
          setBlocks((arr) => {
            const fi = arr.findIndex((b) => b.id === d.from);
            if (fi < 0) return arr;
            const copy = [...arr];
            const [moved] = copy.splice(fi, 1);
            let ti = copy.findIndex((b) => b.id === d.to);
            if (ti < 0) return arr;
            if (d.after) ti += 1;
            copy.splice(ti, 0, moved);
            return copy;
          });
        if (d.local) {
          // プレビュー側で FLIP アニメが再生されるので、その完了後に状態を確定
          // （このタイミングで iframe が再読込みされても見た目は同じ位置）
          window.setTimeout(apply, 430);
        } else {
          apply();
          setSelId(d.from);
        }
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // 選択が変わったとき：枠表示＋その位置までスクロール（iframe 内のみ）
  useEffect(() => {
    previewRef.current?.contentWindow?.postMessage({ mu: "highlight", id: selId, scroll: true }, "*");
  }, [selId]);

  // 編集で再描画されたとき：枠だけ復元し、スクロールはしない（色調整などで画面が飛ばないように）
  const selIdRef = useRef(selId);
  useEffect(() => {
    selIdRef.current = selId;
  }, [selId]);
  useEffect(() => {
    previewRef.current?.contentWindow?.postMessage(
      { mu: "highlight", id: selIdRef.current, scroll: false },
      "*",
    );
  }, [previewHtml]);

  // キーボード：Ctrl/Cmd+Z で戻る、Ctrl/Cmd+Shift+Z または Ctrl+Y で進む
  useEffect(() => {
    if (mode !== "edit") return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, past, future, blocks]);

  function chooseStructure(i: number | null) {
    setPendingTpl(i);
    setTheme(i == null ? DEFAULT_THEME : TEMPLATES[i].theme);
    setMode("design");
  }
  function createPage() {
    if (blocks.length > 0 && !confirm("現在の編集内容を、選んだ構成で置き換えます。よろしいですか？")) return;
    setBlocks(pendingTpl == null ? [] : TEMPLATES[pendingTpl].make(target));
    setSelId(null);
    setDocId(null);
    setDocName("");
    setPast([]);
    setFuture([]);
    setMode("edit");
  }
  function addBlock(type: BlockType) {
    const b: Block = { id: rid(), type, props: { ...BLOCK_DEFAULT[type] } };
    setBlocks((arr) => [...arr, b]);
    setSelId(b.id);
  }
  function update(id: string, patch: Partial<Block> & { props?: Record<string, string> }) {
    setBlocks((arr) =>
      arr.map((b) =>
        b.id === id ? { ...b, ...patch, props: patch.props ? { ...b.props, ...patch.props } : b.props } : b,
      ),
    );
  }
  const remove = (id: string) => setBlocks((a) => a.filter((b) => b.id !== id));
  function dup(id: string) {
    setBlocks((arr) => {
      const i = arr.findIndex((b) => b.id === id);
      if (i < 0) return arr;
      return [...arr.slice(0, i + 1), { ...arr[i], id: rid(), props: { ...arr[i].props } }, ...arr.slice(i + 1)];
    });
  }
  function move(id: string, dir: -1 | 1) {
    setBlocks((arr) => {
      const i = arr.findIndex((b) => b.id === id);
      const j = i + dir;
      return i < 0 || j < 0 || j >= arr.length ? arr : arrayMove(arr, i, j);
    });
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setBlocks((arr) =>
        arrayMove(arr, arr.findIndex((b) => b.id === active.id), arr.findIndex((b) => b.id === over.id)),
      );
    }
  }

  async function exportZip() {
    const zip = new JSZip();
    zip.file("index.html", buildFullHtml(blocks, opts));
    zip.file("style.css", buildCss(theme));
    triggerDownload(await zip.generateAsync({ type: "blob" }), `${target}-toppage.zip`);
    recordHistory(slug, "ページをZIP出力", `${blocks.length}ブロック`);
  }
  function openPreview() {
    const doc = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${inlineHtml}`;
    const url = URL.createObjectURL(new Blob([doc], { type: "text/html" }));
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }
  function exportJson() {
    triggerDownload(
      new Blob([JSON.stringify({ blocks, title, baseUrl, theme }, null, 2)], { type: "application/json" }),
      `${target}-layout.json`,
    );
  }
  function importJson(file: File | undefined) {
    if (!file) return;
    file.text().then((tx) => {
      try {
        const d = JSON.parse(tx);
        if (Array.isArray(d.blocks)) {
          setBlocks(d.blocks);
          setTitle(d.title || title);
          setBaseUrl(d.baseUrl || "");
          setTheme(d.theme || DEFAULT_THEME);
          setDocId(null);
          setDocName("");
          setMode("edit");
          setMsg("レイアウトを読み込みました。保存リストに残すには「保存リストに保存」を押してください。");
        }
      } catch {
        setMsg("JSONの読み込みに失敗しました。");
      }
    });
  }

  // ── STEP 1: 構成 ──
  if (mode === "structure") {
    return (
      <ToolShell slug={slug}>
        <Stepper step={1} />

        {recovered && (
          <div className="card flex flex-wrap items-center gap-3 border-[var(--brand)] p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white"><Glyph name="pencil" size={18} /></span>
            <div className="flex-1">
              <div className="text-sm font-semibold">前回の編集内容が保存されています</div>
              <div className="text-xs text-[var(--muted)]">
                {recovered.blocks.length}ブロック
                {recovered.savedAt ? ` ・ ${new Date(recovered.savedAt).toLocaleString()}` : ""}
              </div>
            </div>
            <button
              onClick={restoreDraft}
              className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              続きから編集
            </button>
            <button onClick={discardDraft} className="rounded-md border px-4 py-2 text-sm font-semibold">
              破棄して新規
            </button>
          </div>
        )}

        {lps.length > 0 && (
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">
                保存したLP <span className="text-xs font-normal text-[var(--muted)]">（{lps.length}件・この端末に保存）</span>
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {lps.map((lp) => (
                <div key={lp.id} className="flex items-center gap-2 rounded-md border p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{lp.name}</div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {lp.blocks.length}ブロック ・ {new Date(lp.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => openLP(lp)}
                    className="shrink-0 rounded-md bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    開く
                  </button>
                  <button
                    onClick={() => copyLP(lp.id)}
                    title="複製"
                    className="shrink-0 rounded-md border px-2 py-1.5 text-xs"
                  >
                    <Glyph name="dup" size={13} />
                  </button>
                  <button
                    onClick={() => removeLP(lp.id, lp.name)}
                    title="削除"
                    className="shrink-0 rounded-md border px-2 py-1.5 text-xs text-[#bf0000]"
                  >
                    <Glyph name="x" size={13} />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              マイページの「作成したLP」からも開けます。編集画面の「保存リストに保存」で追加されます。
            </p>
          </div>
        )}

        <p className="text-sm text-[var(--muted)]">
          まずページの構成を選びます。カードの「プレビュー」で完成イメージ、バッジで構成タイプを確認できます。あとから自由に編集できます。
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((tpl, i) => (
            <div
              key={tpl.id}
              className="card relative flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <button
                onClick={() => setPreviewTpl(i)}
                className="absolute right-3 top-3 rounded-full border bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold"
              >
                <Glyph name="eye" size={13} className="mr-1" />プレビュー
              </button>
              <button onClick={() => chooseStructure(i)} className="flex flex-col gap-2 text-left">
                <ToolIcon name={tpl.icon} color={tpl.color} size={40} />
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{tpl.name}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: `${tpl.color}1f`, color: tpl.color }}
                  >
                    {tpl.flow}
                  </span>
                </div>
                <div className="text-xs text-[var(--muted)]">{tpl.desc}</div>
                <div className="text-[11px] text-[var(--muted)]">構成：{tpl.outline}</div>
              </button>
              <button
                onClick={() => chooseStructure(i)}
                className="mt-auto rounded-md bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white"
              >
                この構成で進む
              </button>
            </div>
          ))}
          <button
            onClick={() => chooseStructure(null)}
            className="card flex flex-col items-start justify-center gap-2 border-dashed p-4 text-left text-[var(--muted)] hover:shadow-md"
          >
            <span className="text-2xl">＋</span>
            <div className="font-semibold text-[var(--foreground)]">空白から始める</div>
            <div className="text-xs">ブロックを1つずつ追加</div>
          </button>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--brand)]">
          保存済みレイアウトを読み込む
          <input type="file" accept=".json" className="hidden" onChange={(e) => importJson(e.target.files?.[0])} />
        </label>

        {previewTpl != null && (
          <PreviewModal
            title={`${TEMPLATES[previewTpl].name}（${TEMPLATES[previewTpl].flow}）`}
            html={previewDoc(
              buildInlineHtml(TEMPLATES[previewTpl].make(target), {
                title,
                baseUrl,
                target,
                theme: TEMPLATES[previewTpl].theme,
              }),
            )}
            onClose={() => setPreviewTpl(null)}
            onUse={() => {
              const i = previewTpl;
              setPreviewTpl(null);
              chooseStructure(i);
            }}
          />
        )}
      </ToolShell>
    );
  }

  // ── STEP 2: デザイン ──
  if (mode === "design") {
    // プレビューは実際に作成される構成と一致させる（省略しない）。空白選択時のみ雰囲気用サンプル。
    const previewBlocks =
      pendingTpl == null
        ? TEMPLATES[TEMPLATES.length - 1].make(target).slice(0, 4)
        : TEMPLATES[pendingTpl].make(target);
    return (
      <ToolShell slug={slug}>
        <Stepper step={2} />
        <p className="text-sm text-[var(--muted)]">
          フォントとテーマカラーを選ぶと、サイト全体のCSSに反映されます（あとから変更・個別上書き可）。
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ThemePanel theme={theme} onChange={setTheme} />
          <div>
            <p className="mb-1 text-xs font-semibold text-[var(--muted)]">プレビュー</p>
            <iframe
              title="theme-preview"
              sandbox="allow-scripts"
              srcDoc={previewDoc(buildInlineHtml(previewBlocks, { ...opts, theme }))}
              className="w-full rounded-lg border bg-white"
              style={{ height: 420 }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode("structure")} className="rounded-md border px-4 py-2 text-sm font-semibold">
            ← 構成に戻る
          </button>
          <button onClick={createPage} className="rounded-md bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white">
            この設定で作成 →
          </button>
        </div>
      </ToolShell>
    );
  }

  // ── STEP 3: 編集 ──
  return (
    <ToolShell slug={slug}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            if (confirm("構成テンプレートの選択画面に戻ります。編集中の内容は自動保存され、次回「続きから編集」で開けます。")) {
              setRecovered({ blocks, title, baseUrl, theme, savedAt: Date.now() });
              setMode("structure");
            }
          }}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
        >
          構成テンプレートを選び直す
        </button>
        <button
          onClick={() => setShowDesign((v) => !v)}
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          style={{ borderColor: theme.primary, color: theme.primary }}
        >
          デザイン設定（フォント・色）
        </button>

        <span className="mx-1 hidden h-4 w-px bg-[var(--line)] sm:inline-block" />
        <span className="text-xs text-[var(--muted)]">
          {docId ? (
            <>保存リスト：<span className="font-semibold text-[var(--foreground)]">{docName}</span></>
          ) : (
            "未保存（保存リストに未登録）"
          )}
        </span>
        <button
          onClick={() => saveNamed(false)}
          className="rounded-md bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white"
        >
          {docId ? "保存リストを上書き" : "保存リストに保存"}
        </button>
        {docId && (
          <button
            onClick={() => saveNamed(true)}
            className="rounded-md border px-3 py-1.5 text-xs font-semibold"
          >
            別名で保存
          </button>
        )}
      </div>

      {showDesign && (
        <div className="card p-4">
          <ThemePanel theme={theme} onChange={setTheme} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ページタイトル">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="画像ベースURL（任意）" hint="相対ファイル名の先頭に付与。例: https://www.rakuten.ne.jp/gold/shop/img">
          <TextInput value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
        </Field>
      </div>

      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--muted)]">ブロックを追加</p>
          <button
            onClick={() => setShowGallery((v) => !v)}
            className="rounded-md border px-2.5 py-1 text-[11px] font-semibold"
          >
            {showGallery ? "リスト表示にする" : (<><Glyph name="eye" size={13} className="mr-1" />プレビューで選ぶ</>)}
          </button>
        </div>
        {showGallery ? (
          <BlockGallery theme={theme} baseUrl={baseUrl} target={target} onAdd={addBlock} />
        ) : (
          <div className="divide-y">
            {BLOCK_GROUP.map((g) => (
              <div
                key={g.label}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="pt-1.5 text-[11px] text-[var(--muted)]">{g.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {g.types.map((bt) => (
                    <BlockChip
                      key={bt}
                      bt={bt}
                      theme={theme}
                      baseUrl={baseUrl}
                      target={target}
                      onAdd={addBlock}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-xs font-semibold text-[var(--muted)]">
              構成（{blocks.length}ブロック・ドラッグで並び替え）
            </p>
            <button
              onClick={undo}
              disabled={past.length === 0}
              title="元に戻す（Ctrl+Z）"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-35"
            >
              <Glyph name="undo" size={13} /> 戻る
            </button>
            <button
              onClick={redo}
              disabled={future.length === 0}
              title="やり直す（Ctrl+Shift+Z）"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold disabled:opacity-35"
            >
              進む <Glyph name="redo" size={13} />
            </button>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map((b) => (
                <SortableBlock
                  key={b.id}
                  block={b}
                  theme={theme}
                  selected={selId === b.id}
                  onSelect={() => setSelId(selId === b.id ? null : b.id)}
                  onUpdate={(patch) => update(b.id, patch)}
                  onRemove={() => remove(b.id)}
                  onDup={() => dup(b.id)}
                  onMove={(d) => move(b.id, d)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {blocks.length === 0 && (
            <p className="text-sm text-[var(--muted)]">「ブロックを追加」から始めてください。</p>
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-[var(--muted)]">プレビュー</p>
            {[390, 768, 1080].map((w) => (
              <button
                key={w}
                onClick={() => setPw(w)}
                className={`rounded border px-2 py-0.5 text-xs ${pw === w ? "border-[var(--brand)] font-semibold" : ""}`}
              >
                {w === 390 ? "スマホ" : w === 768 ? "タブレット" : "PC"}
              </button>
            ))}
            <button onClick={openPreview} className="rounded border px-2 py-0.5 text-xs">
              別タブで開く <Glyph name="external" size={12} className="ml-0.5" />
            </button>
            <span className="text-[11px] text-[var(--muted)]">
              セクションをクリックで選択 / ドラッグで並び替え
            </span>
            <span className="ml-auto flex items-center gap-1 text-[11px] text-[var(--muted)]">
              ガイド
              <input
                type="color"
                value={guideColor}
                onChange={(e) => setGuideColor(e.target.value)}
                className="h-6 w-8 rounded border"
                title="ガイドの色"
              />
              <input
                type="range"
                min={10}
                max={100}
                value={guideOpacity}
                onChange={(e) => setGuideOpacity(+e.target.value)}
                className="w-16"
                title="ガイドの透明度"
              />
            </span>
          </div>
          {/* スクロールは iframe 内の1本だけにする（外側のラッパーはスクロールさせない） */}
          <div
            ref={previewWrapRef}
            className="overflow-hidden rounded-xl border bg-[#f3f3f3] p-3"
          >
            <iframe
              ref={previewRef}
              title="preview"
              sandbox="allow-scripts"
              onLoad={() =>
                previewRef.current?.contentWindow?.postMessage(
                  { mu: "highlight", id: selId, smooth: false },
                  "*",
                )
              }
              srcDoc={iframeDoc}
              style={{
                width: pw,
                height: previewZoom < 1 ? Math.round(620 / previewZoom) : 620,
                border: 0,
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 4px 20px rgba(0,0,0,.12)",
                display: "block",
                margin: "0 auto",
                zoom: previewZoom,
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-bold">公開・書き出し</p>
          <p className="text-xs text-[var(--muted)]">
            作ったページを実際のショップに設置するためのデータを出力します。どれを使えばいいか迷ったら、説明を読んで選んでください。
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
            <button
              onClick={exportZip}
              className="shrink-0 rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white sm:w-52"
            >
              ZIPで書き出し
            </button>
            <span className="text-xs leading-relaxed text-[var(--muted)]">
              {target === "rakuten"
                ? "★おすすめ。index.html と style.css の一式（zip）。楽天GOLDのFTPにアップロードして設置します。画像は別途アップロードが必要です。"
                : "index.html と style.css の一式（zip）。自分でサーバーにアップして使う場合はこちら。"}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
            <button
              onClick={() => navigator.clipboard?.writeText(inlineHtml).then(() => setMsg("HTMLをコピーしました。"))}
              className="shrink-0 rounded-md border px-4 py-2 text-sm font-semibold sm:w-52"
            >
              HTMLをコピー
            </button>
            <span className="text-xs leading-relaxed text-[var(--muted)]">
              CSSも含めて1ファイルにまとめたHTMLをクリップボードにコピーします。
              {target === "yahoo"
                ? "Yahoo!ストアクリエイターProの「HTML編集」に貼り付けて使います（<script>が制限される環境ではスライド・カウントダウン・タブは動きません）。"
                : "管理画面のHTML入力欄など、1か所に貼り付けたいとき用。"}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
            <button
              onClick={exportJson}
              className="shrink-0 rounded-md border px-4 py-2 text-sm font-semibold sm:w-52"
            >
              レイアウトJSONを保存
            </button>
            <span className="text-xs leading-relaxed text-[var(--muted)]">
              編集データのバックアップ用ファイル。別のPCへ移すとき、または後から読み込んで続きから編集したいとき用です（ショップにそのまま貼るものではありません）。
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
            <label className="shrink-0 cursor-pointer rounded-md border px-4 py-2 text-center text-sm font-semibold sm:w-52">
              JSONを読み込み
              <input type="file" accept=".json" className="hidden" onChange={(e) => importJson(e.target.files?.[0])} />
            </label>
            <span className="text-xs leading-relaxed text-[var(--muted)]">
              上で保存した「レイアウトJSON」ファイルを選ぶと、その内容をこの編集画面に復元します。
            </span>
          </div>
        </div>

        <div className="rounded-md border border-dashed p-3 text-xs leading-relaxed text-[var(--muted)]">
          <span className="font-semibold text-[var(--foreground)]">作業内容の保存について：</span>{" "}
          編集内容はこの端末に<strong className="text-[var(--foreground)]">自動保存</strong>されます（何もしなくてOK。次に開くと「続きから編集」できます）。
          名前を付けて複数のLPを管理したいときは、画面上部の
          <strong className="text-[var(--foreground)]">「保存リストに保存」</strong>
          を押してください（マイページの「作成したLP」からも開けます）。
        </div>

        {msg && <p className="text-sm text-[var(--brand)]">{msg}</p>}

        <p className="text-[11px] text-[var(--muted)]">
          商品グリッド・ランキングの自動更新、FTPへの自動アップロードは拡張連携ツール（準備中）で対応予定です。
        </p>
      </div>
    </ToolShell>
  );
}

// ── PreviewModal ──
function PreviewModal({
  title,
  html,
  onClose,
  onUse,
}: {
  title: string;
  html: string;
  onClose: () => void;
  onUse: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border bg-[var(--surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-semibold">{title}</span>
          <button onClick={onClose} className="rounded border px-2 py-0.5 text-xs">
            閉じる
          </button>
        </div>
        <iframe
          title="tpl-preview"
          sandbox="allow-scripts"
          srcDoc={html}
          className="flex-1 bg-white"
          style={{ width: "100%", minHeight: 480 }}
        />
        <div className="border-t p-3">
          <button
            onClick={onUse}
            className="w-full rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            この構成で進む →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stepper ──
function Stepper({ step }: { step: 1 | 2 }) {
  const items = ["構成を選ぶ", "デザインを選ぶ", "編集・書き出し"];
  return (
    <div className="flex items-center gap-2 text-sm">
      {items.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: active || done ? "var(--brand)" : "var(--surface-soft)",
                color: active || done ? "#fff" : "var(--muted)",
              }}
            >
              {n}
            </span>
            <span className={active ? "font-semibold" : "text-[var(--muted)]"}>{label}</span>
            {n < 3 && <span className="text-[var(--muted)]">›</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── ThemePanel ──
function ThemePanel({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const set = (patch: Partial<Theme>) => onChange({ ...theme, ...patch });
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="mb-1.5 font-semibold">
          フォント
          <Help text="ページ全体の書体です。見出し・本文すべてに適用されます。端末に入っている標準フォントのみ使用するため確実に表示されます。" />
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {FONTS.map((f) => (
            <button
              key={f.key}
              onClick={() => set({ font: f.key as FontKey })}
              className={`card p-3 text-left ${theme.font === f.key ? "ring-2 ring-[var(--brand)]" : ""}`}
            >
              <div style={{ fontFamily: f.stack, fontSize: 18, fontWeight: 700 }}>{f.label}</div>
              <div style={{ fontFamily: f.stack }} className="mt-0.5 text-xs text-[var(--muted)]">
                {f.sample}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 font-semibold">テーマカラー</p>
        <div className="flex flex-wrap gap-2">
          {THEME_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => set({ primary: c.primary, accent: c.accent })}
              title={c.name}
              className={`h-9 w-9 rounded-full border-2 ${
                theme.primary === c.primary ? "border-[var(--foreground)]" : "border-transparent"
              }`}
              style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.primary})` }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="flex items-center gap-1 text-xs">
            メインカラー
            <Help text="サイトの主役の色。ボタン・クーポン・商品価格・ランキング1位バッジ・見出しの左バーなどに使われます。各ブロックで個別に上書きもできます。" />
            <input type="color" value={theme.primary} onChange={(e) => set({ primary: e.target.value })} className="h-8 w-12 rounded border" />
          </label>
          <label className="flex items-center gap-1 text-xs">
            アクセント
            <Help text="補助の強調色。見出しの下線、ヒーローの背景グラデーション（画像なし時）などに使われます。" />
            <input type="color" value={theme.accent} onChange={(e) => set({ accent: e.target.value })} className="h-8 w-12 rounded border" />
          </label>
        </div>
      </div>

      <div>
        <p className="mb-1.5 font-semibold">
          ページ背景色
          <Help text="ページ全体（body）と本文エリアの背景色です。書き出すHTML／プレビューの両方に反映されます。各ブロックの背景色とは別で、ブロック側で個別指定したものが優先されます。" />
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["#ffffff", "白"],
              ["#faf7f2", "アイボリー"],
              ["#f4f5f7", "ライトグレー"],
              ["#f3ede4", "ベージュ"],
              ["#fdf3f5", "淡ピンク"],
              ["#14161a", "ダーク"],
            ] as [string, string][]
          ).map(([hex, name]) => (
            <button
              key={hex}
              onClick={() => set({ bg: hex })}
              title={name}
              className={`h-8 w-8 rounded-full border-2 ${
                (theme.bg || "#ffffff").toLowerCase() === hex ? "border-[var(--foreground)]" : "border-[var(--line)]"
              }`}
              style={{ background: hex }}
            />
          ))}
          <label className="flex items-center gap-1 text-xs">
            <span className="text-[var(--muted)]">指定</span>
            <input
              type="color"
              value={theme.bg || "#ffffff"}
              onChange={(e) => set({ bg: e.target.value })}
              className="h-8 w-12 rounded border"
            />
          </label>
          {(theme.bg || "#ffffff").toLowerCase() !== "#ffffff" && (
            <button
              onClick={() => set({ bg: "#ffffff" })}
              className="rounded border px-2 py-1 text-[11px] text-[var(--muted)]"
            >
              白に戻す
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div>
          <p className="mb-1.5 font-semibold">
            角丸
            <Help text="ボタン・画像・カード・クーポン・スライドショーなど、角の丸みをまとめて変更します。ブロック個別でも指定できます。" />
          </p>
          <div className="flex gap-1.5">
            {(
              [
                ["sharp", "シャープ"],
                ["soft", "ソフト"],
                ["round", "まる"],
              ] as [RadiusKey, string][]
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => set({ radius: v })}
                className={`rounded-md border px-3 py-1 text-xs ${theme.radius === v ? "border-[var(--brand)] font-semibold" : ""}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 font-semibold">
            見出しの装飾
            <Help text="「見出し」ブロックの飾りです。左に縦バー／中央に短い下線／飾りなし から選べます。" />
          </p>
          <div className="flex gap-1.5">
            {(
              [
                ["bar", "左バー"],
                ["underline", "中央下線"],
                ["plain", "なし"],
              ] as [HeadingStyle, string][]
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => set({ heading: v })}
                className={`rounded-md border px-3 py-1 text-xs ${theme.heading === v ? "border-[var(--brand)] font-semibold" : ""}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SortableBlock ──
const VIS_LABEL: Record<Visibility, string> = { both: "PC/スマホ", pc: "PCのみ", sp: "スマホのみ" };

function SortableBlock({
  block,
  theme,
  selected,
  onSelect,
  onUpdate,
  onRemove,
  onDup,
  onMove,
}: {
  block: Block;
  theme: Theme;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<Block> & { props?: Record<string, string> }) => void;
  onRemove: () => void;
  onDup: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const summary =
    block.props.text || block.props.heading || block.props.title || block.props.label || block.props.src || "";
  return (
    <div
      ref={setNodeRef}
      id={`beditor-${block.id}`}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`card p-2 ${selected ? "ring-2 ring-[var(--brand)]" : ""}`}
    >
      <div className="flex items-center gap-1 text-sm">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab px-1 text-[var(--muted)]"
          title="ドラッグで移動"
        >
          ⠿
        </button>
        <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="shrink-0 whitespace-nowrap font-medium">{BLOCK_SHORT[block.type]}</span>
          {block.vis && block.vis !== "both" && (
            <span className="shrink-0 whitespace-nowrap rounded bg-[var(--surface-soft)] px-1 text-[10px] text-[var(--muted)]">
              {VIS_LABEL[block.vis]}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--muted)]">{summary}</span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={() => onMove(-1)} className="rounded border px-1.5 py-0.5 text-xs" title="上へ"><Glyph name="arrowUp" size={13} /></button>
          <button onClick={() => onMove(1)} className="rounded border px-1.5 py-0.5 text-xs" title="下へ"><Glyph name="arrowDown" size={13} /></button>
          <button onClick={onDup} className="rounded border px-1.5 py-0.5 text-xs" title="複製"><Glyph name="dup" size={13} /></button>
          <button onClick={onRemove} className="rounded border px-1.5 py-0.5 text-xs text-[#bf0000]" title="削除"><Glyph name="cross" size={13} /></button>
        </div>
      </div>
      {selected && (
        <div className="mt-2 border-t pt-2">
          <label className="mb-2 flex items-center gap-2 text-xs">
            <span className="text-[var(--muted)]">表示</span>
            <select
              value={block.vis ?? "both"}
              onChange={(e) => onUpdate({ vis: e.target.value as Visibility })}
              className="rounded border px-2 py-1"
            >
              {(["both", "pc", "sp"] as Visibility[]).map((v) => (
                <option key={v} value={v}>
                  {VIS_LABEL[v]}
                </option>
              ))}
            </select>
          </label>
          <BlockEditor block={block} theme={theme} onUpdate={(props) => onUpdate({ props })} />
        </div>
      )}
    </div>
  );
}

// ── BlockEditor ──
const RADIUS_OPTS: [string, string][] = [
  ["theme", "テーマに合わせる"],
  ["0", "角なし"],
  ["8", "小"],
  ["16", "大"],
  ["999", "まる"],
];

function BlockEditor({
  block,
  theme,
  onUpdate,
}: {
  block: Block;
  theme: Theme;
  onUpdate: (p: Record<string, string>) => void;
}) {
  const p = block.props;
  const T = (k: string, label: string, ph = "") => (
    <label className="block text-xs">
      <span className="mb-0.5 block text-[var(--muted)]">{label}</span>
      <input value={p[k] ?? ""} placeholder={ph} onChange={(e) => onUpdate({ [k]: e.target.value })} className="w-full rounded border px-2 py-1 text-sm" />
    </label>
  );
  const Num = (k: string, label: string, ph = "") => (
    <label className="block text-xs">
      <span className="mb-0.5 block text-[var(--muted)]">{label}</span>
      <input type="number" value={p[k] ?? ""} placeholder={ph} onChange={(e) => onUpdate({ [k]: e.target.value })} className="w-full rounded border px-2 py-1 text-sm" />
    </label>
  );
  const Area = (k: string, label: string, ph = "") => (
    <label className="block text-xs sm:col-span-2">
      <span className="mb-0.5 block text-[var(--muted)]">{label}</span>
      <textarea value={p[k] ?? ""} placeholder={ph} onChange={(e) => onUpdate({ [k]: e.target.value })} rows={3} className="w-full rounded border px-2 py-1 font-mono text-xs" />
    </label>
  );
  // 複数画像ブロック用：行ごとに画像ドロップ/選択/URL で編集できる
  const Rows = (k: string, label: string, columns: RowCol[], addLabel: string) => (
    <div className="block text-xs sm:col-span-2">
      <span className="mb-1 block text-[var(--muted)]">{label}</span>
      <RowsEditor
        value={p[k] ?? ""}
        onChange={(v) => onUpdate({ [k]: v })}
        columns={columns}
        addLabel={addLabel}
      />
    </div>
  );
  // 短い文言だが Enter で改行したい欄用（見出し・クーポン等）
  const TA = (k: string, label: string, ph = "Enterで改行", rows = 2) => (
    <label className="block text-xs">
      <span className="mb-0.5 block text-[var(--muted)]">{label}</span>
      <textarea
        value={p[k] ?? ""}
        placeholder={ph}
        onChange={(e) => onUpdate({ [k]: e.target.value })}
        rows={rows}
        className="w-full resize-y rounded border px-2 py-1 text-sm leading-snug"
      />
    </label>
  );
  const Sel = (k: string, label: string, o: [string, string][]) => (
    <label className="block text-xs">
      <span className="mb-0.5 block text-[var(--muted)]">{label}</span>
      <select value={p[k] ?? o[0][0]} onChange={(e) => onUpdate({ [k]: e.target.value })} className="rounded border px-2 py-1 text-sm">
        {o.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  const Align = (k = "align") => Sel(k, "配置", [["left", "左"], ["center", "中央"], ["right", "右"]]);
  const Color = (k: string, label: string) => (
    <ColorAlpha label={label} value={p[k] ?? ""} onChange={(v) => onUpdate({ [k]: v })} />
  );
  const CF = (k: string, label: string, fallback: string) => (
    <ColorField
      label={label}
      value={p[k] ?? ""}
      fallback={fallback}
      onChange={(v) => onUpdate({ [k]: v })}
      onClear={() => onUpdate({ [k]: "" })}
    />
  );
  const Chk = (k: string, label: string) => (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" checked={p[k] === "1"} onChange={(e) => onUpdate({ [k]: e.target.checked ? "1" : "" })} />
      <span>{label}</span>
    </label>
  );
  const IMG = (k: string, label: string) => (
    <label className="block text-xs sm:col-span-2">
      <span className="mb-0.5 block text-[var(--muted)]">{label}</span>
      <ImageDrop value={p[k] ?? ""} onChange={(v) => onUpdate({ [k]: v })} />
    </label>
  );
  const Fx = () => (
    <>
      {CF("ovColor", "オーバーレイ色", "#000000")}
      {Num("ov", "オーバーレイ濃度 0-100", "0")}
      {Num("blur", "曇りガラス（ぼかしpx）", "0")}
    </>
  );
  const bt = block.type;
  const R = (k = "radius") => Sel(k, "角丸", RADIUS_OPTS);

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {bt === "hero" && (
        <>
          {IMG("src", "背景画像（ドロップ / ファイル選択 / URL）")}
          {TA("heading", "見出し")}
          {TA("sub", "サブ見出し")}
          {T("href", "セクションのリンク（任意）")}
          {Align()}
          {Num("minH", "高さ（px）", "360")}
          {Color("textColor", "文字色")}
          {CF("ovColor", "オーバーレイ色", "#000000")}
          {Num("overlay", "オーバーレイ濃度 0-100", "40")}
          {Num("blur", "曇りガラス（ぼかしpx）", "0")}
          {T("btnLabel", "ボタン文言（空欄で非表示）")}
          {T("btnHref", "ボタンのリンク")}
          {CF("btnColor", "ボタンの枠・文字色", p.textColor || "#ffffff")}
          {CF("btnHoverBg", "ボタン カーソル時の背景", "#ffffff")}
          {CF("btnHoverColor", "ボタン カーソル時の文字色", "#111111")}
          {CF("gradFrom", "背景グラデ開始（画像なし時）", theme.accent)}
          {CF("gradTo", "背景グラデ終了（画像なし時）", theme.primary)}
        </>
      )}
      {bt === "heading" && (
        <>
          {Area("text", "テキスト")}
          {Sel("level", "サイズ", [["h2", "大"], ["h3", "中"], ["h4", "小"]])}
          {Align()}
          {Sel("weight", "太さ", [["800", "極太"], ["700", "太"], ["600", "中"]])}
          {CF("color", "文字色", "#222222")}
          {CF("accent", "飾り（バー/下線）の色", theme.accent)}
        </>
      )}
      {bt === "richtext" && (
        <>
          {T("title", "タイトル")}
          {Align()}
          {Area("lead", "リード文（改行OK）")}
          {CF("titleColor", "タイトルの色", theme.primary)}
          {CF("leadColor", "リード文の色", "#555555")}
        </>
      )}
      {bt === "text" && (
        <>
          {Area("text", "本文（改行OK）")}
          {Align()}
          {CF("color", "文字色", "#2b2b2b")}
          {Num("size", "文字サイズ（px）", "15")}
        </>
      )}
      {bt === "image" && (
        <>
          {IMG("src", "画像（ドロップ / ファイル選択 / URL）")}
          {T("href", "リンク先URL（任意）")}
          {T("alt", "代替テキスト")}
          {Num("width", "幅（%）", "100")}
          {R()}
          {Sel("shadow", "影", [["none", "なし"], ["soft", "やわらか"], ["strong", "強め"]])}
          {Fx()}
        </>
      )}
      {bt === "image2col" && (
        <>
          {IMG("src1", "左 画像")}
          {T("href1", "左 リンク")}
          {IMG("src2", "右 画像")}
          {T("href2", "右 リンク")}
          {Num("gap", "間隔（px）", "16")}
          {R()}
        </>
      )}
      {bt === "image3col" && (
        <>
          {IMG("src1", "1 画像")}
          {T("href1", "1 リンク")}
          {IMG("src2", "2 画像")}
          {T("href2", "2 リンク")}
          {IMG("src3", "3 画像")}
          {T("href3", "3 リンク")}
          {Num("gap", "間隔（px）", "12")}
          {R()}
        </>
      )}
      {bt === "banner" && (
        <>
          {IMG("src", "画像（ドロップ / ファイル選択 / URL）")}
          {T("href", "リンク先URL")}
          {T("alt", "代替テキスト")}
          {T("caption", "キャプション（任意）")}
          {Color("capColor", "キャプションの色")}
          {R()}
          {Sel("shadow", "影", [["none", "なし"], ["soft", "やわらか"], ["strong", "強め"]])}
          {Fx()}
        </>
      )}
      {bt === "iconmenu" && (
        <>
          {Sel("cols", "列数（項目4個以下のとき）", [["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"]])}
          <p className="text-[11px] text-[var(--muted)] sm:col-span-2">
            項目が5個以上のときは自動で横スクロールの帯になります（詰め込み・文字切れ防止）。
          </p>
          {Num("iconSize", "アイコンサイズ（px）", "42")}
          {R()}
          {CF("bg", "セル背景色", "#ffffff")}
          {CF("border", "枠線の色", "#eeeeee")}
          {CF("labelColor", "ラベル文字色", "#333333")}
          {CF("hover", "hover時の枠色", theme.primary)}
          {Rows(
            "items",
            "項目（ラベル・アイコン画像・リンク）",
            [{ label: "ラベル" }, { label: "アイコン画像（任意）", image: true }, { label: "リンク先URL" }],
            "項目を追加",
          )}
        </>
      )}
      {bt === "slideshow" && (
        <>
          {Num("interval", "切替秒数", "4")}
          {R()}
          {CF("dot", "ページャー（ドット）の色", "#ffffff")}
          {Rows(
            "slides",
            "スライド（画像・リンク）",
            [{ label: "画像", image: true }, { label: "リンク先URL（任意）" }],
            "スライドを追加",
          )}
        </>
      )}
      {(bt === "productgrid" || bt === "ranking") && (
        <>
          {bt === "productgrid" && Sel("cols", "列数", [["2", "2"], ["3", "3"], ["4", "4"]])}
          <div className="sm:col-span-2">{Chk("auto", "自動更新エリアにする（拡張連携で毎日更新）")}</div>
          {p.auto !== "1" &&
            Rows(
              "items",
              "商品（商品名・画像・価格・リンク）",
              [
                { label: "商品名" },
                { label: "商品画像", image: true },
                { label: "価格（例: 2,980円）" },
                { label: "リンク先URL" },
              ],
              "商品を追加",
            )}
          {CF("cardBg", "カード背景色", "#ffffff")}
          {CF("border", "カード枠線の色", "#eeeeee")}
          {CF("nameColor", "商品名の色", "#333333")}
          {CF("priceColor", "価格の色", theme.primary)}
          {R()}
          {bt === "ranking" && CF("badge", "順位バッジの色（金銀銅をやめて統一）", theme.primary)}
        </>
      )}
      {bt === "coupon" && (
        <>
          {TA("title", "見出し")}
          {TA("detail", "条件など")}
          {T("code", "クーポンコード（任意）")}
          {T("href", "リンク先URL")}
          {CF("bg", "背景色", theme.primary)}
          {Color("color", "文字色")}
          {R()}
        </>
      )}
      {bt === "countdown" && (
        <>
          {T("title", "見出し")}
          <label className="block text-xs">
            <span className="mb-0.5 block text-[var(--muted)]">終了日時（カレンダーで選択）</span>
            <input
              type="datetime-local"
              value={p.deadline ?? ""}
              onChange={(e) => onUpdate({ deadline: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          {Color("bg", "背景色")}
          {Color("color", "文字色")}
          {CF("accent", "数字の色", p.color || "#ffffff")}
          {R()}
        </>
      )}
      {bt === "button" && (
        <>
          {T("label", "ボタン文言")}
          {T("href", "リンク先URL")}
          {Sel("size", "サイズ", [["sm", "小"], ["md", "中"], ["lg", "大"]])}
          {Align()}
          {CF("bg", "背景色", theme.primary)}
          {Color("color", "文字色")}
          {CF("hoverBg", "カーソル時の背景色", p.bg || theme.primary)}
          {CF("hoverColor", "カーソル時の文字色", p.color || "#ffffff")}
          {R()}
          <div className="flex flex-col gap-1">
            {Chk("full", "横幅いっぱいにする")}
            {Chk("shadow", "影をつける")}
          </div>
        </>
      )}
      {bt === "sns" && (
        <>
          {Sel("kind", "種類", [["instagram", "Instagram"], ["youtube", "YouTube"], ["x", "X / その他"]])}
          {T("url", "URL")}
          {CF("bg", "ボタン背景色", theme.primary)}
          {Color("color", "ボタン文字色")}
        </>
      )}
      {bt === "spacer" && (
        <>
          {Num("height", "高さ（px）", "40")}
          {CF("bg", "背景色（帯にする場合）", "#f5f5f5")}
        </>
      )}
      {bt === "divider" && (
        <>
          {Color("color", "線の色")}
          {Sel("style", "線種", [["solid", "実線"], ["dashed", "破線"], ["dotted", "点線"]])}
          {Num("width", "幅（%）", "100")}
          {Num("thickness", "太さ（px）", "1")}
        </>
      )}
      {bt === "featurelist" && (
        <>
          {Sel("style", "番号スタイル", [["number", "01・02・03"], ["check", "✓ チェック"]])}
          {Area("items", "項目（1行 = 見出し|説明）", "1本5役のオールインワン|化粧水・美容液・乳液・クリーム・パックがこれ1本。")}
        </>
      )}
      {bt === "steps" && Area("items", "ステップ（1行 = 見出し|説明）", "洗顔・タオルドライ|清潔な肌に。こすらず押さえるように。")}
      {bt === "faq" && Area("items", "Q&A（1行 = 質問|回答）", "定期便はいつでも解約できますか？|次回発送の10日前までにご連絡ください。")}
      {bt === "reviews" && (
        <>
          {Sel("cols", "列数", [["1", "1"], ["2", "2"]])}
          {Area("items", "声（1行 = 本文|名前|属性）", "朝の支度が5分短くなりました。|M.K さん|30代・女性")}
          {T("note", "注記（任意）", "※感想には個人差があります")}
        </>
      )}
      {bt === "notice" && Area("text", "注意書き（改行OK・小さい文字で表示）")}

      {bt === "infobar" && (
        <>
          {TA("text", "文言")}
          {T("cta", "ボタン文言（空欄で非表示）", "くわしく見る")}
          {T("href", "リンク先URL")}
          {CF("bg", "背景色", theme.primary)}
          {Color("color", "文字色")}
        </>
      )}
      {bt === "gallery" && (
        <>
          {Sel("cols", "列数", [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]])}
          {Num("gap", "画像の間隔（px）", "8")}
          {R()}
          {Rows(
            "items",
            "画像（画像・リンク）",
            [{ label: "画像", image: true }, { label: "リンク先URL（任意）" }],
            "画像を追加",
          )}
        </>
      )}
      {bt === "video" && (
        <>
          {T("url", "動画URL（YouTube または .mp4 / .webm）")}
          {IMG("poster", "サムネイル画像（MP4のとき／任意）")}
          {Sel("ratio", "アスペクト比", [["16/9", "16:9"], ["4/3", "4:3"], ["1/1", "1:1"], ["9/16", "9:16（縦）"]])}
          {T("caption", "キャプション（任意）")}
        </>
      )}
      {bt === "media" && (
        <>
          {IMG("src", "画像（ドロップ / ファイル選択 / URL）")}
          {T("href", "画像のリンク（任意）")}
          {TA("heading", "見出し")}
          {Area("body", "本文（改行OK）")}
          {T("btnLabel", "ボタン文言（空欄で非表示）")}
          {T("btnHref", "ボタンのリンク")}
          {Align()}
          {Chk("reverse", "画像を右側にする")}
        </>
      )}
      {bt === "beforeafter" && (
        <>
          {IMG("before", "Before 画像")}
          {IMG("after", "After 画像")}
          {T("labelBefore", "左のラベル", "Before")}
          {T("labelAfter", "右のラベル", "After")}
          {T("note", "注記（任意）", "※効果には個人差があります")}
        </>
      )}
      {bt === "logos" && (
        <>
          {T("title", "見出し（任意）", "取り扱いブランド")}
          {Chk("grayscale", "グレースケール表示にする")}
          {Rows(
            "items",
            "ロゴ（ロゴ画像・リンク）",
            [{ label: "ロゴ画像", image: true }, { label: "リンク先URL（任意）" }],
            "ロゴを追加",
          )}
        </>
      )}
      {bt === "tabs" && Area("items", "タブ（1行 = タブ名|中身。中身は改行OK）", "商品詳細|素材・仕様・お手入れ方法。")}
      {bt === "accordion" && (
        <>
          {Chk("open", "最初の項目を開いた状態にする")}
          {Area("items", "項目（1行 = 見出し|本文。本文は改行OK）", "配送について|3〜5営業日で発送します。")}
        </>
      )}
      {bt === "spotlight" && (
        <>
          {IMG("src", "商品画像")}
          {T("href", "商品ページのURL")}
          {T("tag", "ラベル（任意）", "数量限定")}
          {TA("name", "商品名")}
          {Area("desc", "説明文（改行OK）")}
          {T("price", "価格表示", "9,800円")}
          {T("btnLabel", "ボタン文言", "商品ページを見る")}
          {Chk("reverse", "画像を右側にする")}
        </>
      )}
      {bt === "pricing" && (
        <>
          {Area(
            "items",
            "プラン（1行 = 名前|価格|特徴（;区切り）|ボタン文言|おすすめ:1）",
            "定期便|1,780円|5%OFF;いつでも解約OK|定期便を始める|1",
          )}
          {T("note", "注記（任意）", "※価格は税込です")}
        </>
      )}
      {bt === "compare" && (
        <>
          {T("head", "見出し行（| 区切り。1列目は空でもOK）", "項目|当店|A社|B社")}
          {Area("rows", "行（1行 = 項目|値|値|値。○ × も使えます）", "送料|無料|550円|440円")}
          {Chk("highlight", "2列目（当店）を強調する")}
        </>
      )}
      {bt === "stats" && (
        <>
          {Sel("cols", "列数", [["2", "2"], ["3", "3"], ["4", "4"]])}
          {CF("color", "数字の色", theme.primary)}
          {Area("items", "項目（1行 = ラベル|数字）", "累計販売|128,000個")}
        </>
      )}
      {bt === "badges" && Area("items", "バッジ（1行 = 見出し|補足）", "送料無料|3,980円以上のご購入で")}
      {bt === "rating" && (
        <>
          {Num("score", "評価スコア（0〜5）", "4.6")}
          {T("count", "レビュー件数", "842")}
          {T("dist", "星の分布（5→1を | 区切りの%）", "72|19|5|2|2")}
          {T("note", "注記（任意）")}
        </>
      )}
      {bt === "talk" && Area("items", "会話（1行 = l または r|セリフ）", "l|毎朝のスキンケア、時間がかかって…")}
      {bt === "timeline" && Area("items", "予定（1行 = 日付|見出し|説明）", "6/1（土）|予約受付スタート|数量限定")}
      {bt === "recommend" && (
        <>
          {T("title", "見出し", "こんな方におすすめ")}
          {Area("items", "項目（1行 = 1つ）", "スキンケアを時短で済ませたい")}
        </>
      )}
      {bt === "calendar" && (
        <>
          <label className="block text-xs">
            <span className="mb-0.5 block text-[var(--muted)]">対象の月（空欄で今月）</span>
            <input
              type="month"
              value={p.month ?? ""}
              onChange={(e) => onUpdate({ month: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </label>
          {T("closed", "定休日の曜日（0=日〜6=土, カンマ区切り）", "0,6")}
          {T("holidays", "その他の休業日（日付, カンマ区切り）", "15,23")}
          {Area("note", "凡例・注記", "＝定休日（発送業務はお休み）")}
        </>
      )}

      {bt === "html" && Area("code", "HTML")}
    </div>
  );
}
