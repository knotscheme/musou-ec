"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { ToolShell, Field, Stat } from "@/components/ToolShell";
import { Glyph } from "@/components/Glyph";
import { downloadCSV, toCSV, triggerDownload } from "@/lib/csv";
import { recordHistory } from "@/lib/history";
import { filesFromDrop } from "@/lib/dropfiles";
import {
  analyzePhotos,
  classifyPhotos,
  isImageFile,
  pickBest,
  DEFAULT_CFG,
  VERDICT_LABEL,
  type CullCfg,
  type PhotoInfo,
  type Verdict,
} from "@/lib/photocull";

type FilterKey = "all" | Verdict["kind"];

const KIND_FG: Record<Verdict["kind"], string> = {
  keeper: "#1a8a5a",
  dup: "#a1701c",
  blur: "#bf0000",
  protected: "#5b6472",
  unreadable: "#5b6472",
};
const KIND_SHORT: Record<Verdict["kind"], string> = {
  keeper: "使える",
  dup: "連写重複",
  blur: "ピンボケ",
  protected: "保護",
  unreadable: "読込不可",
};

function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
  );
}

export default function PhotoCull() {
  const [cfg, setCfg] = useState<CullCfg>(DEFAULT_CFG);
  const [photos, setPhotos] = useState<PhotoInfo[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [busy, setBusy] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const photosRef = useRef<PhotoInfo[]>([]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    },
    [],
  );

  const set = <K extends keyof CullCfg>(k: K, val: CullCfg[K]) =>
    setCfg((c) => ({ ...c, [k]: val }));

  async function analyze(files: File[]) {
    const list = files.filter(isImageFile);
    if (!list.length) return;
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setFilter("all");
    setProgress({ done: 0, total: list.length });
    const out = await analyzePhotos(list, cfg, (done, total) => setProgress({ done, total }));
    setPhotos(out);
    setProgress(null);
  }

  // しきい値・時刻窓などの変更は再解析なしで即座に仕分けし直す
  const result = useMemo(
    () => (photos.length ? classifyPhotos(photos, cfg) : null),
    [photos, cfg],
  );

  const counts = result?.counts;
  const bestIds = useMemo(() => {
    const s = new Set<number>();
    result?.groups.forEach((g) => {
      if (g.length >= 2) s.add(pickBest(g).id);
    });
    return s;
  }, [result]);

  const view = useMemo(() => {
    if (!result) return [];
    if (filter === "all") return photos;
    return photos.filter((p) => result.verdict.get(p.id)?.kind === filter);
  }, [photos, result, filter]);

  const bursts = useMemo(
    () => (result ? result.groups.filter((g) => g.length >= 2) : []),
    [result],
  );

  function reportRows(): (string | number)[][] {
    const rows: (string | number)[][] = [
      [
        "判定",
        "グループ",
        "focus_whole",
        "focus_patch",
        "撮影日時",
        "時刻ソース",
        "pHash(先頭16)",
        "size_bytes",
        "ファイル名",
      ],
    ];
    if (!result) return rows;
    for (const p of photos) {
      const v = result.verdict.get(p.id);
      rows.push([
        v ? VERDICT_LABEL[v.kind] : "?",
        v && "group" in v && v.group >= 0 ? v.group : "",
        p.focusWhole == null ? "" : p.focusWhole.toFixed(1),
        p.focusPatch == null ? "" : p.focusPatch.toFixed(1),
        p.capturedAt == null ? "" : fmtDateTime(p.capturedAt),
        p.capturedAt == null ? "" : p.timeFromExif ? "exif" : "mtime",
        p.phashHex ? p.phashHex.slice(0, 16) : "",
        p.sizeBytes,
        p.name,
      ]);
    }
    return rows;
  }

  function exportCsv() {
    downloadCSV(`photo-cull-report_${new Date().toISOString().slice(0, 10)}`, reportRows());
  }

  async function exportZip() {
    if (!result) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      const put = (folder: string, p: PhotoInfo) => {
        const dot = p.name.lastIndexOf(".");
        const stem = dot > 0 ? p.name.slice(0, dot) : p.name;
        const ext = dot > 0 ? p.name.slice(dot) : "";
        let path = `${folder}/${p.name}`;
        let n = 1;
        while (used.has(path.toLowerCase())) path = `${folder}/${stem}_${n++}${ext}`;
        used.add(path.toLowerCase());
        zip.file(path, p.file);
      };
      for (const p of photos) {
        const v = result.verdict.get(p.id);
        if (!v) continue;
        if (v.kind === "keeper") put("使える", p);
        else if (v.kind === "dup") put("捨て候補/連写重複", p);
        else if (v.kind === "blur") put("捨て候補/ピンボケ", p);
        else if (v.kind === "protected") put("保護（未仕分け）", p);
        else put("読み込み不可", p);
      }
      zip.file("photo_cull_report.csv", "﻿" + toCSV(reportRows()));
      const blob = await zip.generateAsync({ type: "blob" });
      triggerDownload(blob, `photo-cull_${new Date().toISOString().slice(0, 10)}.zip`);
      recordHistory(
        "photo-cull",
        `${photos.length}枚を仕分け`,
        `使える${result.counts.keeper} / 連写重複${result.counts.dup} / ピンボケ${result.counts.blur}`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ToolShell slug="photo-cull">
      <div className="card p-4 text-sm text-[var(--muted)]">
        撮影フォルダの写真をまとめて読み込み、<strong>連写・重複のベスト選別</strong>と
        <strong>ピンボケ判定</strong>を自動化します。デスクトップ版 Photo_cull と同じ判定
        （ラプラシアン分散＋タイル最大分散／pHash＋EXIF撮影時刻）をブラウザ内だけで実行し、
        画像は外部に送信しません。結果は
        <strong>「使える／捨て候補（連写重複・ピンボケ）」に振り分けた ZIP</strong> と CSV で出力できます。
        推定のため、最終確認は目視で行ってください。
      </div>

      <div className="card p-4">
        <button
          onClick={() => setShowAdvanced((s) => !s)}
          className="mb-1 flex items-center gap-1 text-sm font-semibold"
        >
          <Glyph name={showAdvanced ? "undo" : "settings"} size={14} />
          判定の詳細設定{showAdvanced ? "を閉じる" : "（連写の秒数・ボケしきい値など）"}
        </button>
        {showAdvanced && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={`連写とみなす時刻差：${cfg.timeWindowSec} 秒`} hint="この秒数以内＋似た構図で1グループ">
              <input
                type="range"
                min={0.5}
                max={10}
                step={0.5}
                value={cfg.timeWindowSec}
                onChange={(e) => set("timeWindowSec", +e.target.value)}
                className="w-full"
              />
            </Field>
            <Field label={`pHash 距離しきい値：${cfg.hashThreshold}`} hint="256中。小さいほど厳密に「同じ構図」">
              <input
                type="range"
                min={0}
                max={96}
                value={cfg.hashThreshold}
                onChange={(e) => set("hashThreshold", +e.target.value)}
                className="w-full"
              />
            </Field>
            <Field label="ピンボケ指標">
              <select
                value={cfg.blurMetric}
                onChange={(e) => set("blurMetric", e.target.value as CullCfg["blurMetric"])}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="patch">patch（タイル最大分散・推奨）</option>
                <option value="whole">whole（画像全体の分散）</option>
                <option value="off">off（ピンボケ判定しない）</option>
              </select>
            </Field>
            {cfg.blurMetric !== "off" && (
              <Field
                label={`ボケしきい値：${cfg.blurThreshold}`}
                hint="この値未満で「ボケ」。下げると誤爆が減る"
              >
                <input
                  type="range"
                  min={20}
                  max={800}
                  step={10}
                  value={cfg.blurThreshold}
                  onChange={(e) => set("blurThreshold", +e.target.value)}
                  className="w-full"
                />
              </Field>
            )}
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={cfg.cameraNamesOnly}
                onChange={(e) => set("cameraNamesOnly", e.target.checked)}
                className="mt-0.5"
              />
              <span>
                カメラの元ファイル名だけ対象
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  IMG_ / DSC_ / _MG_ / PXL_ 等。品番・色名・連番へリネーム済みは触らない
                </span>
              </span>
            </label>
          </div>
        )}
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOver(false);
          analyze((await filesFromDrop(e.dataTransfer)).map((d) => d.file));
        }}
        className={`card flex flex-col items-center gap-2 border-dashed p-8 text-center transition ${
          dragOver ? "border-[var(--brand)] bg-[var(--surface-soft)]" : ""
        }`}
      >
        <Glyph name="upload" size={26} className="text-[var(--muted)]" />
        <span className="text-sm font-semibold">撮影データ（フォルダごと）をドラッグ&ドロップ</span>
        <span className="text-xs text-[var(--muted)]">
          すべて端末内処理・外部送信なし／枚数が多いと解析に時間がかかります
        </span>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <label className="cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold">
            写真を選ぶ
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => analyze(Array.from(e.target.files ?? []))}
              className="hidden"
            />
          </label>
          <label className="cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold">
            フォルダを選ぶ
            <input
              type="file"
              // @ts-expect-error webkitdirectory は型に無いがフォルダ選択に有効
              webkitdirectory=""
              onChange={(e) => analyze(Array.from(e.target.files ?? []))}
              className="hidden"
            />
          </label>
        </div>
      </label>

      {progress && (
        <div className="space-y-1">
          <p className="text-sm">
            解析中… {progress.done} / {progress.total} 枚
          </p>
          <div className="h-2 overflow-hidden rounded bg-[var(--surface-soft)]">
            <div
              className="h-full bg-[var(--brand)] transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {result && counts && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="走査枚数" value={`${counts.total}`} />
            <Stat label="使える" value={`${counts.keeper}`} tone="ok" />
            <Stat label="連写重複" value={`${counts.dup}`} tone={counts.dup ? "warn" : "ok"} />
            <Stat label="ピンボケ" value={`${counts.blur}`} tone={counts.blur ? "bad" : "ok"} />
            <Stat label="保護（対象外）" value={`${counts.protected}`} />
            <Stat label="連写グループ" value={`${result.burstGroups}`} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["all", `すべて ${counts.total}`],
                ["keeper", `使える ${counts.keeper}`],
                ["dup", `連写重複 ${counts.dup}`],
                ["blur", `ピンボケ ${counts.blur}`],
                ["protected", `保護 ${counts.protected}`],
                ["unreadable", `読込不可 ${counts.unreadable}`],
              ] as [FilterKey, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  filter === k ? "border-[var(--brand)] bg-[var(--brand)] text-white" : ""
                }`}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="rounded-md border px-3 py-1 text-xs font-semibold"
              >
                <Glyph name="download" size={12} className="mr-1" />
                CSV
              </button>
              <button
                onClick={exportZip}
                disabled={busy}
                className="rounded-md bg-[var(--brand)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Glyph name="download" size={12} className="mr-1" />
                {busy ? "ZIP作成中…" : "仕分け結果をZIP"}
              </button>
            </div>
          </div>

          {bursts.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">連写・重複グループ（{bursts.length} 組）</p>
              {bursts.map((g, gi) => (
                <div key={gi} className="card p-3">
                  <p className="mb-2 text-xs text-[var(--muted)]">
                    グループ {result.groups.indexOf(g)}・{g.length} 枚 → ベスト1枚を採用
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {g.map((p) => {
                      const best = bestIds.has(p.id);
                      return (
                        <div key={p.id} className="w-20 text-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.url}
                            alt=""
                            className={`h-20 w-20 rounded object-cover ${
                              best ? "ring-2 ring-[#1a8a5a]" : "opacity-60"
                            }`}
                          />
                          <span
                            className="mt-0.5 block text-[10px] font-bold"
                            style={{ color: best ? "#1a8a5a" : "#a1701c" }}
                          >
                            {best ? "ベスト" : "重複"}
                          </span>
                          <span className="block truncate text-[10px] text-[var(--muted)]" title={p.name}>
                            {p.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs text-[var(--muted)]">
                <tr>
                  <th className="w-14 px-3 py-2 text-left">画像</th>
                  <th className="px-3 py-2 text-left">ファイル名</th>
                  <th className="w-24 px-3 py-2 text-left">判定</th>
                  <th className="w-16 px-3 py-2 text-right">グループ</th>
                  <th className="w-24 px-3 py-2 text-right">ピント(patch)</th>
                  <th className="w-40 px-3 py-2 text-left">撮影時刻</th>
                </tr>
              </thead>
              <tbody>
                {view.map((p) => {
                  const v = result.verdict.get(p.id);
                  const kind = v?.kind ?? "unreadable";
                  return (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="" className="h-10 w-10 rounded object-cover" />
                      </td>
                      <td className="max-w-[1px] truncate px-3 py-2 font-medium" title={p.name}>
                        {p.name}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{ background: `${KIND_FG[kind]}22`, color: KIND_FG[kind] }}
                        >
                          {KIND_SHORT[kind]}
                        </span>
                        {v?.kind === "dup" && (
                          <span className="ml-1 text-[10px] text-[var(--muted)]" title={`ベスト: ${v.bestName}`}>
                            ← {v.bestName}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {v && "group" in v && v.group >= 0 ? v.group : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-xs">
                        {p.focusPatch == null ? "—" : p.focusPatch.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-xs tabular-nums text-[var(--muted)]">
                        {p.capturedAt == null ? "—" : fmtDateTime(p.capturedAt).slice(0, 19)}
                        {p.capturedAt != null && (
                          <span className="ml-1 rounded border px-1 text-[9px]">
                            {p.timeFromExif ? "EXIF" : "更新時刻"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {view.length === 0 && (
                  <tr className="border-t">
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-[var(--muted)]">
                      この条件に一致する画像はありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ToolShell>
  );
}
