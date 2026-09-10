"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { ToolShell, Field, Stat } from "@/components/ToolShell";
import { Glyph } from "@/components/Glyph";
import { downloadCSV, parseCSV, toCSV, triggerDownload } from "@/lib/csv";
import { recordHistory } from "@/lib/history";
import { filesFromDrop } from "@/lib/dropfiles";
import { isImageFile, readExifCaptureMs } from "@/lib/photocull";
import {
  computeRows,
  newRule,
  RULE_LABELS,
  splitName,
  supportsIncludeExt,
  type RenameInput,
  type RenameRule,
  type RuleType,
} from "@/lib/renamer";

interface Item {
  file: File;
  name: string;
  /** 取り込み元フォルダ（相対）。単体ファイルは "" */
  folder: string;
  lastModified: number;
  exifDate: number | null;
  exifTried: boolean;
}

const RULE_ORDER: RuleType[] = [
  "sequence",
  "insert",
  "deleteChars",
  "deleteKeyword",
  "replace",
  "ext",
  "caseConv",
  "widthConv",
  "date",
  "csvMap",
];

type FilterKey = "all" | "changed" | "collision";

const inputCls = "w-full rounded-md border px-2.5 py-1.5 text-sm";
const miniCls = "rounded-md border px-2 py-1 text-xs";

export default function CsvRename() {
  const [items, setItems] = useState<Item[]>([]);
  const [rules, setRules] = useState<RenameRule[]>([]);
  const [dedupe, setDedupe] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editorText, setEditorText] = useState("");

  // ルール履歴（元に戻す / やり直す）
  const [history, setHistory] = useState<{ past: RenameRule[][]; future: RenameRule[][] }>({
    past: [],
    future: [],
  });

  const commit = (next: RenameRule[] | ((cur: RenameRule[]) => RenameRule[])) => {
    const resolved = typeof next === "function" ? next(rules) : next;
    setHistory((h) => ({ past: [...h.past, rules].slice(-100), future: [] }));
    setRules(resolved);
  };
  function undo() {
    if (!history.past.length) return;
    const prev = history.past[history.past.length - 1];
    setHistory({ past: history.past.slice(0, -1), future: [rules, ...history.future] });
    setRules(prev);
  }
  function redo() {
    if (!history.future.length) return;
    const nxt = history.future[0];
    setHistory({ past: [...history.past, rules], future: history.future.slice(1) });
    setRules(nxt);
  }

  function addFiles(entries: { file: File; path?: string }[]) {
    if (!entries.length) return;
    const add: Item[] = entries.map(({ file, path }) => {
      const p = path || file.webkitRelativePath || file.name;
      const slash = p.lastIndexOf("/");
      return {
        file,
        name: file.name,
        folder: slash > 0 ? p.slice(0, slash) : "",
        lastModified: file.lastModified,
        exifDate: null,
        exifTried: false,
      };
    });
    setItems((prev) => {
      const key = (it: Item) => `${it.folder}${it.name}${it.file.size}`;
      const seen = new Set(prev.map(key));
      return [...prev, ...add.filter((a) => !seen.has(key(a)))];
    });
    setFilter("all");
  }

  // EXIF 日付ルールが有効なときだけ、画像の撮影日時を遅延読み込み
  const needExif = useMemo(
    () => rules.some((r) => r.enabled && r.type === "date" && r.source === "exif"),
    [rules],
  );
  useEffect(() => {
    if (!needExif) return;
    const targets = items.filter((it) => !it.exifTried && isImageFile(it.file));
    if (!targets.length) return;
    let cancelled = false;
    (async () => {
      for (const it of targets) {
        const ms = await readExifCaptureMs(it.file);
        if (cancelled) return;
        setItems((prev) =>
          prev.map((p) => (p === it ? { ...p, exifDate: ms, exifTried: true } : p)),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needExif, items]);

  const inputs: RenameInput[] = useMemo(
    () => items.map((it) => ({ name: it.name, lastModified: it.lastModified, exifDate: it.exifDate })),
    [items],
  );
  const rows = useMemo(
    () => (items.length ? computeRows(inputs, rules, { dedupe }) : []),
    [inputs, rules, dedupe, items.length],
  );

  const stats = useMemo(() => {
    let changed = 0;
    let collision = 0;
    let error = 0;
    for (const r of rows) {
      if (r.error) error++;
      if (r.collision) collision++;
      if (r.changed && !r.error) changed++;
    }
    return { total: rows.length, changed, collision, error };
  }, [rows]);

  const view = useMemo(() => {
    if (filter === "changed") return rows.filter((r) => r.changed && !r.error);
    if (filter === "collision") return rows.filter((r) => r.collision || r.error);
    return rows;
  }, [rows, filter]);

  const hasFolders = useMemo(() => items.some((it) => it.folder), [items]);

  // ---- ルール編集 ----
  const patchRule = (id: string, patch: Partial<RenameRule>) =>
    commit((cur) => cur.map((r) => (r.id === id ? ({ ...r, ...patch } as RenameRule) : r)));
  const removeRule = (id: string) => commit((cur) => cur.filter((r) => r.id !== id));
  const move = (id: string, dir: -1 | 1) =>
    commit((cur) => {
      const i = cur.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function importCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const grid = parseCSV(String(reader.result ?? ""));
      const pairs: [string, string][] = [];
      for (const [i, line] of grid.entries()) {
        const from = (line[0] ?? "").trim();
        const to = (line[1] ?? "").trim();
        if (!from || !to) continue;
        if (i === 0 && /旧|元|old|before|変更前/i.test(from)) continue; // ヘッダー行
        pairs.push([from, to]);
      }
      if (!pairs.length) {
        setMsg("CSVから「旧名, 新名」の行を読み取れませんでした。1列目=元の名前, 2列目=新しい名前。「テンプレCSV」で雛形を出力できます。");
        return;
      }
      commit((cur) => {
        const existing = cur.find((r) => r.type === "csvMap");
        if (existing) {
          return cur.map((r) => (r.id === existing.id ? { ...r, pairs, enabled: true } : r));
        }
        return [...cur, { ...newRule("csvMap"), pairs } as RenameRule];
      });
      setMsg(`CSVから ${pairs.length} 件の対応を読み込みました（「CSVで対応表リネーム」ルール）。`);
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const rowsOut: (string | number)[][] = [["元ファイル名", "新ファイル名"]];
    if (items.length) {
      // 読み込み済みファイル名を1列目に、2列目は同じ名前（編集の下敷き）
      for (const it of items) rowsOut.push([it.name, it.name]);
    } else {
      rowsOut.push(["IMG_0001.jpg", "トップ_メイン.jpg"], ["IMG_0002.jpg", "トップ_サブ.jpg"]);
    }
    downloadCSV("rename-template", rowsOut);
  }

  function openEditor() {
    setEditorText(rows.map((r) => r.newName).join("\n"));
    setShowEditor(true);
  }
  function applyTextEditor() {
    const names = editorText.split(/\r?\n/).map((l) => l.trim());
    while (names.length && names[names.length - 1] === "") names.pop();
    if (!names.length) {
      setMsg("テキストエディタが空です。1行に1つ、変更後の名前を入れてください。");
      return;
    }
    commit((cur) => [
      ...cur.filter((r) => r.type !== "textOverride"),
      { ...newRule("textOverride"), names } as RenameRule,
    ]);
    setShowEditor(false);
    setMsg(
      names.length === items.length
        ? `テキストエディタの ${names.length} 行を反映しました（一覧の順番どおり）。`
        : `テキストエディタの ${names.length} 行を反映（ファイルは ${items.length} 件）。行数がずれると末尾が合いません。`,
    );
  }

  function mapRows(): (string | number)[][] {
    const out: (string | number)[][] = [["元ファイル名", "新ファイル名", "状態"]];
    for (const r of rows) {
      out.push([
        r.input.name,
        r.newName,
        r.error ? `エラー:${r.error}` : r.collision ? "衝突" : r.changed ? "変更" : "変更なし",
      ]);
    }
    return out;
  }

  function exportCsv() {
    if (!rows.length) return;
    downloadCSV(`rename-map_${new Date().toISOString().slice(0, 10)}`, mapRows());
    recordHistory("csv-rename", `${rows.length}件の変換マップを出力`, `変更 ${stats.changed} / 衝突 ${stats.collision}`);
  }

  function psQuote(s: string) {
    return "'" + s.replace(/'/g, "''") + "'";
  }

  async function exportZip() {
    if (!rows.length) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      const apply: string[] = ["# 元のフォルダで実行すると、その場でリネームします", "$ErrorActionPreference = 'Stop'"];
      const undoLines: string[] = ["# リネームを元に戻します", "$ErrorActionPreference = 'Stop'"];
      const taken = new Set<string>(); // フルパス(小文字)で重複回避＝同名でも別フォルダなら可
      for (const r of rows) {
        if (r.error) continue;
        const it = items[r.index];
        if (!it) continue;
        const dir = it.folder ? it.folder + "/" : "";
        let target = r.newName;
        if (taken.has((dir + target).toLowerCase())) {
          const { stem, ext } = splitName(target);
          let n = 2;
          while (taken.has(`${dir}${stem}_${n}${ext}`.toLowerCase())) n++;
          target = `${stem}_${n}${ext}`;
        }
        taken.add((dir + target).toLowerCase());
        zip.file(dir + target, it.file);
        if (target !== it.name) {
          apply.push(
            `Rename-Item -LiteralPath ${psQuote(dir + it.name)} -NewName ${psQuote(target)}`,
          );
          undoLines.push(
            `Rename-Item -LiteralPath ${psQuote(dir + target)} -NewName ${psQuote(it.name)}`,
          );
        }
      }
      zip.file("_rename_map.csv", "﻿" + toCSV(mapRows()));
      zip.file("_apply_rename.ps1", apply.join("\r\n") + "\r\n");
      zip.file("_undo_rename.ps1", undoLines.join("\r\n") + "\r\n");
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, `csv-rename_${new Date().toISOString().slice(0, 10)}.zip`);
      recordHistory("csv-rename", `${rows.length}件をZIP出力`, `変更 ${stats.changed} / 衝突 ${stats.collision}`);
    } finally {
      setBusy(false);
    }
  }

  function clearAll() {
    setItems([]);
    setFilter("all");
    setMsg("");
  }

  return (
    <ToolShell slug="csv-rename">
      <div className="card p-4 text-sm text-[var(--muted)]">
        複数ファイル・フォルダーの名前を<strong>ルールを重ねて一括変換</strong>します。連番付与／文字の追加・削除・置換／
        拡張子変更／大文字小文字・全角半角／更新日時(・画像はEXIF撮影日時)の付与に対応。文字操作系は
        <strong>「拡張子も対象」</strong>にでき、<strong>テキストエディタ</strong>で変更後の名前を直接編集、
        「元ファイル名,新ファイル名」の<strong>CSVで対応表リネーム</strong>も可能。
        ブラウザ内処理で実ファイルは変更せず、<strong>変換マップCSV</strong>と
        <strong>リネーム済みコピーのZIP（フォルダ構成維持・適用/元に戻す PowerShell 付き）</strong>を出力します。
      </div>

      {/* 取り込み */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(await filesFromDrop(e.dataTransfer));
        }}
        className={`card flex flex-col items-center gap-2 border-dashed p-6 text-center transition ${
          dragOver ? "border-[var(--brand)] bg-[var(--surface-soft)]" : ""
        }`}
      >
        <Glyph name="upload" size={24} className="text-[var(--muted)]" />
        <span className="text-sm font-semibold">ファイル／フォルダーをドラッグ&ドロップ</span>
        <span className="text-xs text-[var(--muted)]">すべて端末内処理・外部送信なし</span>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <label className={`cursor-pointer ${miniCls} font-semibold`}>
            ファイルを追加
            <input
              type="file"
              multiple
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []).map((file) => ({ file })));
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
          </label>
          <label className={`cursor-pointer ${miniCls} font-semibold`}>
            フォルダを追加
            <input
              type="file"
              // @ts-expect-error webkitdirectory は型に無いがフォルダ選択に有効
              webkitdirectory=""
              onChange={(e) => {
                addFiles(
                  Array.from(e.target.files ?? []).map((file) => ({
                    file,
                    path: file.webkitRelativePath || file.name,
                  })),
                );
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
          </label>
          <label className={`cursor-pointer ${miniCls} font-semibold`}>
            CSVで対応表を読み込み
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
                e.currentTarget.value = "";
              }}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={downloadTemplate}
            className={`${miniCls} font-semibold`}
            title={items.length ? "読み込み済みのファイル名入りテンプレを出力" : "記入例入りテンプレを出力"}
          >
            <Glyph name="download" size={12} className="mr-1" />
            テンプレCSV
          </button>
          {items.length > 0 && (
            <button type="button" onClick={clearAll} className={`${miniCls} font-semibold text-[var(--muted)]`}>
              リストを空にする（{items.length}件）
            </button>
          )}
        </div>
      </label>
      {msg && <p className="text-xs text-[var(--muted)]">{msg}</p>}

      {/* ルール */}
      {items.length > 0 && (
        <div className="card space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">変換ルール（上から順に適用）</span>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => (showEditor ? setShowEditor(false) : openEditor())}
                className={`${miniCls} font-semibold ${showEditor ? "border-[var(--brand)] text-[var(--brand)]" : ""}`}
                title="変更後の名前を1行ずつ直接編集"
              >
                <Glyph name="pencil" size={12} /> テキストエディタ
              </button>
              <button
                type="button"
                onClick={undo}
                disabled={!history.past.length}
                className={`${miniCls} disabled:opacity-40`}
                title="元に戻す"
              >
                <Glyph name="undo" size={12} /> 元に戻す
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!history.future.length}
                className={`${miniCls} disabled:opacity-40`}
                title="やり直す"
              >
                <Glyph name="redo" size={12} /> やり直す
              </button>
            </div>
          </div>

          {showEditor && (
            <div className="rounded-lg border border-[var(--brand)] p-3">
              <p className="mb-1 text-xs text-[var(--muted)]">
                下の一覧の<strong>順番どおり</strong>に、1行=1ファイルの「変更後の名前」を書きます。
                反映すると「テキストエディタで指定」ルールが末尾に追加され、他ルールより優先されます。
                空行はその行のファイルを変更しません。
              </p>
              <textarea
                value={editorText}
                onChange={(e) => setEditorText(e.target.value)}
                rows={Math.min(16, Math.max(4, items.length))}
                spellCheck={false}
                className="w-full rounded-md border px-2.5 py-2 font-mono text-xs"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={applyTextEditor}
                  className="rounded-md bg-[var(--brand)] px-3 py-1 text-xs font-semibold text-white"
                >
                  反映する
                </button>
                <button
                  type="button"
                  onClick={() => setEditorText(rows.map((r) => r.newName).join("\n"))}
                  className={`${miniCls} font-semibold`}
                >
                  現在の変更後を読み込み直す
                </button>
                <span className="text-xs text-[var(--muted)]">
                  {editorText.split(/\r?\n/).filter((l, i, a) => l.trim() !== "" || i < a.length - 1).length} 行 / ファイル {items.length} 件
                </span>
              </div>
            </div>
          )}

          {rules.map((rule, i) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              first={i === 0}
              last={i === rules.length - 1}
              onPatch={(p) => patchRule(rule.id, p)}
              onRemove={() => removeRule(rule.id)}
              onMove={(d) => move(rule.id, d)}
            />
          ))}

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <span className="text-xs text-[var(--muted)]">ルールを追加：</span>
            {RULE_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => commit((cur) => [...cur, newRule(t)])}
                className={`${miniCls} font-semibold`}
              >
                + {RULE_LABELS[t]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />
            新しい名前が重複したら自動で「_2」を付ける
          </label>
        </div>
      )}

      {/* プレビュー */}
      {rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="対象ファイル" value={`${stats.total}`} />
            <Stat label="変更あり" value={`${stats.changed}`} tone="ok" />
            <Stat label="名前の衝突" value={`${stats.collision}`} tone={stats.collision ? "bad" : "ok"} />
            <Stat label="エラー" value={`${stats.error}`} tone={stats.error ? "warn" : "ok"} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["all", `すべて ${stats.total}`],
                ["changed", `変更あり ${stats.changed}`],
                ["collision", `要確認 ${stats.collision + stats.error}`],
              ] as [FilterKey, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  filter === k ? "border-[var(--brand)] bg-[var(--brand)] text-white" : ""
                }`}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={exportCsv} className={`${miniCls} font-semibold`}>
                <Glyph name="download" size={12} className="mr-1" />
                変換マップCSV
              </button>
              <button
                type="button"
                onClick={exportZip}
                disabled={busy}
                className="rounded-md bg-[var(--brand)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Glyph name="download" size={12} className="mr-1" />
                {busy ? "ZIP作成中…" : "リネーム済みZIP"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs text-[var(--muted)]">
                <tr>
                  <th className="w-10 px-2 py-2 text-right">#</th>
                  {hasFolders && <th className="px-3 py-2 text-left">フォルダ名</th>}
                  <th className="px-3 py-2 text-left">元の名前</th>
                  <th className="w-6 px-1 py-2" />
                  <th className="px-3 py-2 text-left">新しい名前</th>
                </tr>
              </thead>
              <tbody>
                {view.slice(0, 600).map((r) => (
                  <tr key={r.index} className="border-t align-top">
                    <td className="px-2 py-1.5 text-right tabular-nums text-xs text-[var(--muted)]">
                      {r.index + 1}
                    </td>
                    {hasFolders && (
                      <td
                        className="max-w-[1px] truncate px-3 py-1.5 text-xs text-[var(--muted)]"
                        title={items[r.index]?.folder || ""}
                      >
                        {items[r.index]?.folder || "—"}
                      </td>
                    )}
                    <td className="max-w-[1px] truncate px-3 py-1.5 text-[var(--muted)]" title={r.input.name}>
                      {r.input.name}
                    </td>
                    <td className="px-1 py-1.5 text-center text-[var(--muted)]">→</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`break-all ${
                          r.error
                            ? "text-[#a1701c]"
                            : r.collision
                              ? "font-semibold text-[#bf0000]"
                              : r.changed
                                ? "font-semibold text-[#1a8a5a]"
                                : "text-[var(--muted)]"
                        }`}
                      >
                        {r.newName}
                      </span>
                      {r.collision && <span className="ml-1 text-[10px] text-[#bf0000]">衝突</span>}
                      {r.error && <span className="ml-1 text-[10px] text-[#a1701c]">{r.error}</span>}
                    </td>
                  </tr>
                ))}
                {view.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={hasFolders ? 5 : 4} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                      この条件に一致するファイルはありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {view.length > 600 && (
            <p className="text-xs text-[var(--muted)]">
              プレビューは先頭 600 件のみ表示（CSV / ZIP には全 {view.length} 件が含まれます）。
            </p>
          )}
        </>
      )}
    </ToolShell>
  );
}

// ============================================================================
// ルールカード
// ============================================================================

function RuleCard({
  rule,
  first,
  last,
  onPatch,
  onRemove,
  onMove,
}: {
  rule: RenameRule;
  first: boolean;
  last: boolean;
  onPatch: (p: Partial<RenameRule>) => void;
  onRemove: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  return (
    <div className={`rounded-lg border p-3 ${rule.enabled ? "" : "opacity-50"}`}>
      <div className="mb-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={rule.enabled}
          onChange={(e) => onPatch({ enabled: e.target.checked })}
        />
        <span className="text-sm font-semibold">{RULE_LABELS[rule.type]}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={first}
            className={`${miniCls} disabled:opacity-30`}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={last}
            className={`${miniCls} disabled:opacity-30`}
          >
            ↓
          </button>
          <button type="button" onClick={onRemove} className={`${miniCls} text-[var(--muted)]`}>
            削除
          </button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <RuleFields rule={rule} onPatch={onPatch} />
      </div>
      {supportsIncludeExt(rule.type) && "includeExt" in rule && (
        <label className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
          <input
            type="checkbox"
            checked={rule.includeExt}
            onChange={(e) => onPatch({ includeExt: e.target.checked })}
          />
          拡張子も対象にする（フルネームに適用）
        </label>
      )}
    </div>
  );
}

function RuleFields({
  rule,
  onPatch,
}: {
  rule: RenameRule;
  onPatch: (p: Partial<RenameRule>) => void;
}) {
  const num = (v: string) => (v === "" ? 0 : Number(v));
  switch (rule.type) {
    case "sequence":
      return (
        <>
          <Field label="位置">
            <select
              value={rule.position}
              onChange={(e) => onPatch({ position: e.target.value as typeof rule.position })}
              className={inputCls}
            >
              <option value="prefix">先頭</option>
              <option value="suffix">末尾</option>
              <option value="replace">名前を連番だけにする</option>
            </select>
          </Field>
          <Field label="開始番号">
            <input type="number" value={rule.start} onChange={(e) => onPatch({ start: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="増分">
            <input type="number" value={rule.step} onChange={(e) => onPatch({ step: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="桁数(ゼロ埋め)">
            <input type="number" min={0} max={12} value={rule.digits} onChange={(e) => onPatch({ digits: num(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="区切り文字">
            <input value={rule.separator} onChange={(e) => onPatch({ separator: e.target.value })} className={inputCls} placeholder="_ など" />
          </Field>
        </>
      );
    case "insert":
      return (
        <>
          <Field label="追加する文字">
            <input value={rule.text} onChange={(e) => onPatch({ text: e.target.value })} className={inputCls} />
          </Field>
          <Field label="位置">
            <select
              value={rule.position}
              onChange={(e) => onPatch({ position: e.target.value as typeof rule.position })}
              className={inputCls}
            >
              <option value="prefix">先頭</option>
              <option value="suffix">末尾</option>
              <option value="at">指定位置(先頭からN文字目)</option>
            </select>
          </Field>
          {rule.position === "at" && (
            <Field label="位置(N)">
              <input type="number" min={0} value={rule.index} onChange={(e) => onPatch({ index: num(e.target.value) })} className={inputCls} />
            </Field>
          )}
        </>
      );
    case "deleteChars":
      return (
        <>
          <Field label="どこから">
            <select value={rule.from} onChange={(e) => onPatch({ from: e.target.value as typeof rule.from })} className={inputCls}>
              <option value="start">先頭から</option>
              <option value="end">末尾から</option>
            </select>
          </Field>
          <Field label="削除する文字数">
            <input type="number" min={0} value={rule.count} onChange={(e) => onPatch({ count: num(e.target.value) })} className={inputCls} />
          </Field>
        </>
      );
    case "deleteKeyword":
      return (
        <>
          <Field label="削除するキーワード">
            <input value={rule.keyword} onChange={(e) => onPatch({ keyword: e.target.value })} className={inputCls} placeholder="コピー など" />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-xs">
            <input type="checkbox" checked={rule.all} onChange={(e) => onPatch({ all: e.target.checked })} />
            出現をすべて削除
          </label>
        </>
      );
    case "replace":
      return (
        <>
          <Field label="検索">
            <input value={rule.find} onChange={(e) => onPatch({ find: e.target.value })} className={inputCls} />
          </Field>
          <Field label="置換後">
            <input value={rule.replaceWith} onChange={(e) => onPatch({ replaceWith: e.target.value })} className={inputCls} />
          </Field>
          <div className="flex flex-col gap-1 self-end pb-1 text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={rule.all} onChange={(e) => onPatch({ all: e.target.checked })} />
              すべて置換
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={rule.caseInsensitive} onChange={(e) => onPatch({ caseInsensitive: e.target.checked })} />
              大文字小文字を区別しない
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={rule.regex} onChange={(e) => onPatch({ regex: e.target.checked })} />
              正規表現（$1 で後方参照）
            </label>
          </div>
        </>
      );
    case "ext":
      return (
        <>
          <Field label="やり方">
            <select value={rule.mode} onChange={(e) => onPatch({ mode: e.target.value as typeof rule.mode })} className={inputCls}>
              <option value="lower">小文字に統一</option>
              <option value="upper">大文字に統一</option>
              <option value="set">指定した拡張子にする</option>
            </select>
          </Field>
          {rule.mode === "set" && (
            <Field label="拡張子" hint="例: jpg（空にすると拡張子を削除）">
              <input value={rule.value} onChange={(e) => onPatch({ value: e.target.value })} className={inputCls} placeholder="jpg" />
            </Field>
          )}
        </>
      );
    case "caseConv":
      return (
        <Field label="変換">
          <select value={rule.mode} onChange={(e) => onPatch({ mode: e.target.value as typeof rule.mode })} className={inputCls}>
            <option value="lower">すべて小文字</option>
            <option value="upper">すべて大文字</option>
            <option value="capitalize">単語の頭を大文字</option>
          </select>
        </Field>
      );
    case "widthConv":
      return (
        <>
          <Field label="方向">
            <select value={rule.mode} onChange={(e) => onPatch({ mode: e.target.value as typeof rule.mode })} className={inputCls}>
              <option value="toHalf">全角 → 半角</option>
              <option value="toFull">半角 → 全角</option>
            </select>
          </Field>
          <Field label="対象">
            <select value={rule.scope} onChange={(e) => onPatch({ scope: e.target.value as typeof rule.scope })} className={inputCls}>
              <option value="alnum">英数字・記号</option>
              <option value="katakana">カタカナ</option>
              <option value="both">両方</option>
            </select>
          </Field>
        </>
      );
    case "date":
      return (
        <>
          <Field label="日付の種類">
            <select value={rule.source} onChange={(e) => onPatch({ source: e.target.value as typeof rule.source })} className={inputCls}>
              <option value="modified">更新日時</option>
              <option value="exif">EXIF撮影日時（画像・無ければ更新日時）</option>
            </select>
          </Field>
          <Field label="書式" hint="YYYY MM DD hh mm ss">
            <input value={rule.format} onChange={(e) => onPatch({ format: e.target.value })} className={inputCls} placeholder="YYYYMMDD" />
          </Field>
          <Field label="位置">
            <select value={rule.position} onChange={(e) => onPatch({ position: e.target.value as typeof rule.position })} className={inputCls}>
              <option value="prefix">先頭</option>
              <option value="suffix">末尾</option>
            </select>
          </Field>
          <Field label="区切り文字">
            <input value={rule.separator} onChange={(e) => onPatch({ separator: e.target.value })} className={inputCls} placeholder="_" />
          </Field>
          <p className="col-span-full text-[11px] text-[var(--muted)]">
            ※「作成日時」はブラウザから取得できないため、更新日時 / EXIF撮影日時のみ対応します。
          </p>
        </>
      );
    case "csvMap":
      return (
        <>
          <Field label="照合する対象">
            <select value={rule.matchBy} onChange={(e) => onPatch({ matchBy: e.target.value as typeof rule.matchBy })} className={inputCls}>
              <option value="name">拡張子ありのファイル名</option>
              <option value="stem">拡張子なしの名前</option>
            </select>
          </Field>
          <p className="col-span-full text-[11px] text-[var(--muted)]">
            上の「CSVで対応表を読み込み」で取り込んだ {rule.pairs.length} 件の対応を使います。
            1列目=元の名前 / 2列目=新しい名前。雛形は「テンプレCSV」ボタンから
            （ファイル読み込み後なら現在のファイル名入りで出力）。
          </p>
        </>
      );
    case "textOverride":
      return (
        <p className="col-span-full text-[11px] text-[var(--muted)]">
          「テキストエディタ」で指定した {rule.names.length} 行の名前を、一覧の順番どおりに使います。
          他のルールより優先。編集し直すには上の「テキストエディタ」ボタンから。
        </p>
      );
    default:
      return null;
  }
}
