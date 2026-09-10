/**
 * 撮影データ一括整理（Photo_cull）のブラウザ版コアロジック。
 *
 * デスクトップ版 04_media_tools/Photo_cull（Python + OpenCV / Pillow / imagehash）を
 * サーバー無し・クライアント完結で移植したもの。処理は Canvas / 純JS だけで行い、
 * 画像は一切外部へ送信しない。
 *
 * 判定手法（デスクトップ版と同じ）:
 *   - ピント : グレースケール化 → 3x3 ラプラシアン。画像全体の分散(focusWhole) と、
 *              8x8 タイル分割時の最大分散(focusPatch)。白背景の商品写真での誤爆を避けるため
 *              単独写真のピンボケ判定には focusPatch を使う。
 *   - 類似   : pHash（64x64 → 2D DCT → 低周波16x16 → 中央値2値化 = 256bit）のハミング距離。
 *   - 時刻   : JPEG の EXIF DateTimeOriginal(+SubSecTimeOriginal)。無ければファイル更新時刻。
 *
 * 仕分けの流れ:
 *   1. 全画像を解析（ピント / 撮影時刻 / pHash）
 *   2. ファイル名で保護：IMG_/DSC_/_MG_/PXL_ 等「カメラがつけた名前」だけを対象にし、
 *      品番・色名・連番へリネーム済みのものは触らない
 *   3. 連写・重複グループ化：撮影時刻が近く（既定 2 秒以内）pHash が似ている連続フレームを1組に
 *   4. グループごとにピント最良の1枚を「使える」、残りを「捨て候補（連写重複）」
 *   5. グループに属さない単独写真を focusPatch でピンボケ判定 → 「捨て候補（ピンボケ）」
 */

// ============================================================================
// 設定
// ============================================================================

export interface CullCfg {
  /** 連写とみなす最大の撮影時刻差（秒） */
  timeWindowSec: number;
  /** pHash ハミング距離しきい値（256bit 中。小さいほど厳密） */
  hashThreshold: number;
  /** ピンボケ指標: patch=タイル最大分散 / whole=画像全体の分散 / off=判定しない */
  blurMetric: "patch" | "whole" | "off";
  /** ピント指標がこの値未満なら「ボケ」 */
  blurThreshold: number;
  /** カメラのそのままの名前（IMG_/DSC_…）だけを仕分け対象にする */
  cameraNamesOnly: boolean;
  /** ピント計算前に長辺をこの px へ縮小（0=無効） */
  focusMaxSide: number;
  /** patch 指標のタイル分割数 */
  patchGrid: number;
}

export const DEFAULT_CFG: CullCfg = {
  timeWindowSec: 2,
  hashThreshold: 32,
  blurMetric: "patch",
  blurThreshold: 180,
  cameraNamesOnly: true,
  focusMaxSide: 1600,
  patchGrid: 8,
};

export interface PhotoInfo {
  id: number;
  name: string;
  file: File;
  /** サムネイル表示用の object URL（呼び出し側が revoke する） */
  url: string;
  sizeBytes: number;
  focusWhole: number | null;
  focusPatch: number | null;
  /** 撮影日時（ミリ秒 epoch）。EXIF 優先、無ければファイル更新時刻 */
  capturedAt: number | null;
  timeFromExif: boolean;
  phash: Uint8Array | null;
  phashHex: string;
  error: string | null;
}

export type Verdict =
  | { kind: "keeper"; group: number }
  | { kind: "dup"; group: number; bestName: string }
  | { kind: "blur"; group: number }
  | { kind: "protected" }
  | { kind: "unreadable" };

export interface ClassifyResult {
  groups: PhotoInfo[][];
  verdict: Map<number, Verdict>;
  burstGroups: number;
  counts: {
    total: number;
    keeper: number;
    dup: number;
    blur: number;
    protected: number;
    unreadable: number;
  };
}

// ============================================================================
// ファイル名で保護（カメラのそのままの名前だけを仕分ける）
// ============================================================================

const STRIP_EXTS = [
  ".jpg", ".jpeg", ".png", ".psd", ".psb", ".tif", ".tiff", ".webp", ".bmp",
  ".heic", ".heif", ".gif", ".dng", ".cr2", ".cr3", ".nef", ".arw", ".raf", ".orf", ".rw2",
];

const CAMERA_NAME_RE: RegExp[] = [
  // IMG_1234 / _MG_1234 / DSC_1234 / DSCF1234 / DJI_0001 / GOPR0001 / PXL_20240101_... など
  /^_?(?:img|mg|dsc|dscf|dscn|dsf|pict|dji|gopr|hpim|sdim|kimg|pxl|sam|fuji)[-_]?\d{2,}/i,
  /^_[a-z0-9]{1,3}[a-z]\d{3,4}$/i, // _Q4A0156 / _87A1234（Canon 処理済み RAW）
  /^\d{3}[a-z]\d{3,4}$/i, //           384A8392（Canon フォルダ連番）
  /^p\d{7,8}$/i, //                    P1010001（Panasonic / Olympus）
  /^r\d{7}$/i, //                      R0012345（Ricoh GR）
];

/** 末尾の画像/RAW/PSD 拡張子をすべて剥がした名前（lw053_3.psd.jpg -> lw053_3）。 */
export function nameStem(fileName: string): string {
  let name = fileName;
  let changed = true;
  while (changed) {
    changed = false;
    const low = name.toLowerCase();
    for (const e of STRIP_EXTS) {
      if (low.endsWith(e)) {
        name = name.slice(0, -e.length);
        changed = true;
        break;
      }
    }
  }
  return name;
}

/** ファイル名がカメラのそのままの名前っぽいか（= 仕分けてよい）。 */
export function looksLikeCameraOriginal(fileName: string): boolean {
  const stem = nameStem(fileName).trim();
  return CAMERA_NAME_RE.some((rx) => rx.test(stem));
}

// ============================================================================
// pHash（64x64 → 2D DCT → 低周波16x16 → 中央値2値化）
// ============================================================================

const DN = 64;
const DCOS = (() => {
  const t = new Float64Array(DN * DN);
  for (let k = 0; k < DN; k++) {
    for (let n = 0; n < DN; n++) {
      t[k * DN + n] = Math.cos((Math.PI * (2 * n + 1) * k) / (2 * DN));
    }
  }
  return t;
})();

function phashFromGray64(g: Float64Array): Uint8Array {
  const tmp = new Float64Array(DN * DN);
  const out = new Float64Array(DN * DN);
  for (let y = 0; y < DN; y++) {
    const base = y * DN;
    for (let k = 0; k < DN; k++) {
      let s = 0;
      for (let n = 0; n < DN; n++) s += g[base + n] * DCOS[k * DN + n];
      tmp[base + k] = s;
    }
  }
  for (let x = 0; x < DN; x++) {
    for (let k = 0; k < DN; k++) {
      let s = 0;
      for (let n = 0; n < DN; n++) s += tmp[n * DN + x] * DCOS[k * DN + n];
      out[k * DN + x] = s;
    }
  }
  const low: number[] = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) low.push(out[y * DN + x]);
  const sorted = [...low].sort((a, b) => a - b);
  const med = (sorted[127] + sorted[128]) / 2;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 256; i++) {
    if (low[i] > med) bytes[i >> 3] |= 1 << (7 - (i & 7));
  }
  return bytes;
}

export function hamming(a: Uint8Array, b: Uint8Array): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = a[i] ^ b[i];
    while (x) {
      x &= x - 1;
      d++;
    }
  }
  return d;
}

function toHex(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += u8[i].toString(16).padStart(2, "0");
  return s;
}

// ============================================================================
// ピント（ラプラシアン分散）
// ============================================================================

function focusScores(
  gray: Float64Array,
  w: number,
  h: number,
  grid: number,
): { whole: number; patch: number } {
  const lap = new Float64Array(w * h);
  const at = (x: number, y: number) => {
    const cx = x < 0 ? 0 : x >= w ? w - 1 : x;
    const cy = y < 0 ? 0 : y >= h ? h - 1 : y;
    return gray[cy * w + cx];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      lap[y * w + x] =
        -4 * gray[y * w + x] + at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1);
    }
  }

  let sum = 0;
  for (let i = 0; i < lap.length; i++) sum += lap[i];
  const mean = sum / lap.length;
  let acc = 0;
  for (let i = 0; i < lap.length; i++) {
    const d = lap[i] - mean;
    acc += d * d;
  }
  const whole = acc / lap.length;

  let patch = 0;
  for (let i = 0; i < grid; i++) {
    const y0 = Math.floor((i * h) / grid);
    const y1 = Math.floor(((i + 1) * h) / grid);
    for (let j = 0; j < grid; j++) {
      const x0 = Math.floor((j * w) / grid);
      const x1 = Math.floor(((j + 1) * w) / grid);
      let s = 0;
      let cnt = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        s += lap[y * w + x];
        cnt++;
      }
      if (!cnt) continue;
      const m = s / cnt;
      let a = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const dd = lap[y * w + x] - m;
        a += dd * dd;
      }
      const varr = a / cnt;
      if (varr > patch) patch = varr;
    }
  }
  return { whole, patch };
}

// ============================================================================
// 画像デコード / グレースケール化
// ============================================================================

type DecodedImage = ImageBitmap | HTMLImageElement;

async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "none" });
    } catch {
      /* フォールバックへ */
    }
  }
  return new Promise<DecodedImage | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      resolve(im);
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    im.src = url;
  });
}

function drawGray(
  src: DecodedImage,
  maxSide: number,
): { gray: Float64Array; w: number; h: number } | null {
  const sw = src.width;
  const sh = src.height;
  if (!sw || !sh) return null;
  const scale = maxSide > 0 ? Math.min(1, maxSide / Math.max(sw, sh)) : 1;
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const gray = new Float64Array(w * h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  }
  return { gray, w, h };
}

function drawGray64(src: DecodedImage): Float64Array | null {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(src, 0, 0, 64, 64);
  const d = ctx.getImageData(0, 0, 64, 64).data;
  const g = new Float64Array(4096);
  for (let i = 0, p = 0; i < 4096; i++, p += 4) {
    g[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  }
  return g;
}

// ============================================================================
// EXIF 撮影日時
// ============================================================================

function parseExifDateTime(ab: ArrayBuffer): number | null {
  const v = new DataView(ab);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null; // JPEG SOI

  let o = 2;
  while (o + 4 <= v.byteLength) {
    const marker = v.getUint16(o);
    if ((marker & 0xff00) !== 0xff00) return null;
    if (marker === 0xffd9 || marker === 0xffda) return null; // EOI / SOS
    const segLen = v.getUint16(o + 2);
    if (marker === 0xffe1) {
      const start = o + 4;
      if (
        start + 6 <= v.byteLength &&
        v.getUint32(start) === 0x45786966 && // "Exif"
        v.getUint16(start + 4) === 0x0000
      ) {
        return parseTiffDateTime(v, start + 6, Math.min(v.byteLength, o + 2 + segLen));
      }
      return null;
    }
    o += 2 + segLen;
  }
  return null;
}

function parseTiffDateTime(v: DataView, tiff: number, end: number): number | null {
  if (tiff + 8 > end) return null;
  const le = v.getUint16(tiff) === 0x4949; // "II"
  const u16 = (p: number) => v.getUint16(p, le);
  const u32 = (p: number) => v.getUint32(p, le);
  if (u16(tiff + 2) !== 0x002a) return null;

  const ascii = (entry: number): string => {
    const cnt = u32(entry + 4);
    if (cnt <= 0 || cnt > 64) return "";
    let p = entry + 8;
    if (cnt > 4) p = tiff + u32(entry + 8);
    let s = "";
    for (let i = 0; i < cnt && p + i < end; i++) {
      const c = v.getUint8(p + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };

  const findTag = (ifd: number, tag: number): number | null => {
    if (ifd + 2 > end) return null;
    const n = u16(ifd);
    if (n > 4096) return null;
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > end) break;
      if (u16(e) === tag) return e;
    }
    return null;
  };

  const ifd0 = tiff + u32(tiff + 4);
  let dtStr = "";
  let subStr = "";

  const exifPtr = findTag(ifd0, 0x8769);
  if (exifPtr) {
    const exifIfd = tiff + u32(exifPtr + 8);
    const dtOrig = findTag(exifIfd, 0x9003) || findTag(exifIfd, 0x9004);
    if (dtOrig) dtStr = ascii(dtOrig);
    const sub = findTag(exifIfd, 0x9291) || findTag(exifIfd, 0x9292);
    if (sub) subStr = ascii(sub);
  }
  if (!dtStr) {
    const dt = findTag(ifd0, 0x0132); // DateTime
    if (dt) dtStr = ascii(dt);
  }

  const m = dtStr.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  let ms = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  if (Number.isNaN(ms)) return null;
  const digits = subStr.replace(/\D/g, "");
  if (digits) ms += parseInt((digits + "000").slice(0, 3), 10);
  return ms;
}

// ============================================================================
// 解析フェーズ
// ============================================================================

const IMAGE_NAME_RE = /\.(jpe?g|png|bmp|webp|tiff?|heic|heif)$/i;

export function isImageFile(f: File): boolean {
  return f.type.startsWith("image/") || IMAGE_NAME_RE.test(f.name);
}

export async function analyzeOne(file: File, id: number, cfg: CullCfg): Promise<PhotoInfo> {
  const info: PhotoInfo = {
    id,
    name: file.name,
    file,
    url: URL.createObjectURL(file),
    sizeBytes: file.size,
    focusWhole: null,
    focusPatch: null,
    capturedAt: null,
    timeFromExif: false,
    phash: null,
    phashHex: "",
    error: null,
  };

  try {
    const head = await file.slice(0, 256 * 1024).arrayBuffer();
    const ms = parseExifDateTime(head);
    if (ms != null) {
      info.capturedAt = ms;
      info.timeFromExif = true;
    }
  } catch {
    /* EXIF 読めなければ更新時刻へ */
  }
  if (info.capturedAt == null && Number.isFinite(file.lastModified)) {
    info.capturedAt = file.lastModified;
    info.timeFromExif = false;
  }

  const src = await decodeImage(file);
  if (!src) {
    info.error = "読み込み不可";
    return info;
  }
  try {
    const gg = drawGray(src, cfg.focusMaxSide);
    if (gg) {
      const f = focusScores(gg.gray, gg.w, gg.h, cfg.patchGrid);
      info.focusWhole = f.whole;
      info.focusPatch = f.patch;
    }
    const g64 = drawGray64(src);
    if (g64) {
      info.phash = phashFromGray64(g64);
      info.phashHex = toHex(info.phash);
    }
  } catch {
    info.error = "解析エラー";
  } finally {
    if ("close" in src && typeof src.close === "function") src.close();
  }
  if (info.focusWhole == null && info.phash == null) info.error = "読み込み不可";
  return info;
}

export async function analyzePhotos(
  files: File[],
  cfg: CullCfg,
  onProgress?: (done: number, total: number) => void,
): Promise<PhotoInfo[]> {
  const imgs = files.filter(isImageFile);
  const out: PhotoInfo[] = [];
  for (let i = 0; i < imgs.length; i++) {
    out.push(await analyzeOne(imgs[i], i, cfg));
    onProgress?.(i + 1, imgs.length);
  }
  return out;
}

// ============================================================================
// グループ化 / 仕分け
// ============================================================================

export function groupBursts(photos: PhotoInfo[], cfg: CullCfg): PhotoInfo[][] {
  const ok = (p: PhotoInfo) => p.capturedAt != null && p.phash != null && !p.error;
  const usable = photos.filter(ok);
  const undated = photos.filter((p) => !ok(p));

  usable.sort(
    (a, b) =>
      (a.capturedAt as number) - (b.capturedAt as number) ||
      (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
  );

  const groups: PhotoInfo[][] = [];
  let cur: PhotoInfo[] = [];
  for (const p of usable) {
    if (!cur.length) {
      cur = [p];
      continue;
    }
    const prev = cur[cur.length - 1];
    const gap = Math.abs((p.capturedAt as number) - (prev.capturedAt as number)) / 1000;
    const dist = hamming(p.phash as Uint8Array, prev.phash as Uint8Array);
    if (gap <= cfg.timeWindowSec && dist <= cfg.hashThreshold) cur.push(p);
    else {
      groups.push(cur);
      cur = [p];
    }
  }
  if (cur.length) groups.push(cur);
  for (const p of undated) groups.push([p]);
  return groups;
}

/** グループ内で最もピントが良い1枚。同点はファイルサイズ大 → 名前昇順。 */
export function pickBest(group: PhotoInfo[]): PhotoInfo {
  let best = group[0];
  for (const p of group) {
    const ps = p.focusWhole ?? -Infinity;
    const bs = best.focusWhole ?? -Infinity;
    if (
      ps > bs ||
      (ps === bs && p.sizeBytes > best.sizeBytes) ||
      (ps === bs && p.sizeBytes === best.sizeBytes && p.name < best.name)
    ) {
      best = p;
    }
  }
  return best;
}

export function classifyPhotos(photos: PhotoInfo[], cfg: CullCfg): ClassifyResult {
  const verdict = new Map<number, Verdict>();
  const workable: PhotoInfo[] = [];
  const prot: PhotoInfo[] = [];
  const unread: PhotoInfo[] = [];

  for (const p of photos) {
    if (p.error) {
      unread.push(p);
      continue;
    }
    if (cfg.cameraNamesOnly && !looksLikeCameraOriginal(p.name)) prot.push(p);
    else workable.push(p);
  }

  const groups = groupBursts(workable, cfg);
  const groupOf = new Map<number, number>();
  groups.forEach((g, gi) => g.forEach((p) => groupOf.set(p.id, gi)));

  let burstGroups = 0;
  const survivors: PhotoInfo[] = [];
  groups.forEach((g, gi) => {
    if (g.length < 2) {
      survivors.push(g[0]);
      return;
    }
    burstGroups++;
    const best = pickBest(g);
    survivors.push(best);
    for (const p of g) {
      if (p !== best) verdict.set(p.id, { kind: "dup", group: gi, bestName: best.name });
    }
  });

  for (const p of survivors) {
    const gi = groupOf.get(p.id) ?? -1;
    const inGroup = gi >= 0 && groups[gi].length >= 2;
    const score =
      cfg.blurMetric === "patch" ? p.focusPatch : cfg.blurMetric === "whole" ? p.focusWhole : null;
    const isBlur =
      cfg.blurMetric !== "off" && !inGroup && score != null && score < cfg.blurThreshold;
    verdict.set(p.id, isBlur ? { kind: "blur", group: gi } : { kind: "keeper", group: gi });
  }

  for (const p of prot) verdict.set(p.id, { kind: "protected" });
  for (const p of unread) verdict.set(p.id, { kind: "unreadable" });

  const counts = { total: photos.length, keeper: 0, dup: 0, blur: 0, protected: 0, unreadable: 0 };
  for (const val of verdict.values()) {
    if (val.kind === "keeper") counts.keeper++;
    else if (val.kind === "dup") counts.dup++;
    else if (val.kind === "blur") counts.blur++;
    else if (val.kind === "protected") counts.protected++;
    else counts.unreadable++;
  }

  return { groups, verdict, burstGroups, counts };
}

export const VERDICT_LABEL: Record<Verdict["kind"], string> = {
  keeper: "使える",
  dup: "捨て候補:連写重複",
  blur: "捨て候補:ピンボケ",
  protected: "保護:リネーム済み",
  unreadable: "読み込み不可",
};
