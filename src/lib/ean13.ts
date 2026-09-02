/**
 * JAN / EAN-13・EAN-8 バーコードの生成（依存ライブラリなし）。
 */

const L = [
  "0001101", "0011001", "0010011", "0111101", "0100011",
  "0110001", "0101111", "0111011", "0110111", "0001011",
];
const G = [
  "0100111", "0110011", "0011011", "0100001", "0011101",
  "0111001", "0000101", "0010001", "0001001", "0010111",
];
const R = [
  "1110010", "1100110", "1101100", "1000010", "1011100",
  "1001110", "1010000", "1000100", "1001000", "1110100",
];
// 先頭桁による左6桁のパリティ（L/G）
const PARITY = [
  "LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG",
  "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL",
];

export function checkDigit(digits: string): number {
  // EAN-8/13 共通: 右から重み 3,1,3,1... （= 偶数位置に3）
  const arr = digits.split("").map(Number);
  let sum = 0;
  for (let i = arr.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += arr[i] * w;
  return (10 - (sum % 10)) % 10;
}

export interface NormalizeResult {
  ok: boolean;
  code?: string; // チェックデジットを含む完全なコード
  type?: "EAN-13" | "EAN-8";
  fixed?: boolean; // チェックデジットを補完・訂正した
  error?: string;
}

/** 8/12/13 桁の入力を検証し、完全なコードへ正規化する。 */
export function normalizeCode(raw: string): NormalizeResult {
  const d = raw.replace(/[^0-9]/g, "");
  if (d.length === 0) return { ok: false, error: "空" };
  if (d.length === 12) {
    return { ok: true, code: d + checkDigit(d), type: "EAN-13", fixed: true };
  }
  if (d.length === 13) {
    const cd = checkDigit(d.slice(0, 12));
    if (cd === Number(d[12])) return { ok: true, code: d, type: "EAN-13", fixed: false };
    return { ok: true, code: d.slice(0, 12) + cd, type: "EAN-13", fixed: true };
  }
  if (d.length === 7) {
    return { ok: true, code: d + checkDigit(d), type: "EAN-8", fixed: true };
  }
  if (d.length === 8) {
    const cd = checkDigit(d.slice(0, 7));
    if (cd === Number(d[7])) return { ok: true, code: d, type: "EAN-8", fixed: false };
    return { ok: true, code: d.slice(0, 7) + cd, type: "EAN-8", fixed: true };
  }
  return { ok: false, error: `桁数が不正（${d.length}桁）。12/13桁(JAN) か 7/8桁(EAN-8)` };
}

function modules13(code: string): string {
  const first = Number(code[0]);
  const left = code.slice(1, 7);
  const right = code.slice(7);
  const parity = PARITY[first];
  let bits = "101"; // start guard
  for (let i = 0; i < 6; i++) {
    const n = Number(left[i]);
    bits += parity[i] === "L" ? L[n] : G[n];
  }
  bits += "01010"; // center guard
  for (let i = 0; i < 6; i++) bits += R[Number(right[i])];
  bits += "101"; // end guard
  return bits;
}

function modules8(code: string): string {
  const left = code.slice(0, 4);
  const right = code.slice(4);
  let bits = "101";
  for (let i = 0; i < 4; i++) bits += L[Number(left[i])];
  bits += "01010";
  for (let i = 0; i < 4; i++) bits += R[Number(right[i])];
  bits += "101";
  return bits;
}

export interface SvgOptions {
  moduleWidth?: number; // 1モジュールのpx
  height?: number; // バー高さpx
  quietZone?: number; // 左右の余白（モジュール数）
  showText?: boolean;
}

/** 完全なコード（チェックデジット込み）から SVG 文字列を生成。 */
export function barcodeSvg(code: string, opts: SvgOptions = {}): string {
  const mw = opts.moduleWidth ?? 2;
  const h = opts.height ?? 70;
  const qz = opts.quietZone ?? 10;
  const showText = opts.showText ?? true;
  const isEan8 = code.length === 8;
  const bits = isEan8 ? modules8(code) : modules13(code);
  const textH = showText ? 16 : 0;
  const totalMod = bits.length + qz * 2;
  const w = totalMod * mw;
  const guardExtend = showText ? 8 : 0; // ガードバーを下に伸ばす

  const guardPos = isEan8
    ? new Set<number>()
    : new Set<number>(); // ガード延長は簡略化（全バー同一高さ）
  void guardPos;

  let rects = "";
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") {
      const x = (qz + i) * mw;
      rects += `<rect x="${x}" y="0" width="${mw}" height="${h + guardExtend}"/>`;
    }
  }

  let texts = "";
  if (showText) {
    const y = h + guardExtend + 12;
    const fs = 11;
    if (isEan8) {
      texts =
        `<text x="${(qz + 3 + 14) * mw}" y="${y}" font-size="${fs}" text-anchor="middle">${code.slice(0, 4)}</text>` +
        `<text x="${(qz + 33 + 14) * mw}" y="${y}" font-size="${fs}" text-anchor="middle">${code.slice(4)}</text>`;
    } else {
      texts =
        `<text x="${(qz - 4) * mw}" y="${y}" font-size="${fs}" text-anchor="end">${code[0]}</text>` +
        `<text x="${(qz + 3 + 21) * mw}" y="${y}" font-size="${fs}" text-anchor="middle">${code.slice(1, 7)}</text>` +
        `<text x="${(qz + 50 + 21) * mw}" y="${y}" font-size="${fs}" text-anchor="middle">${code.slice(7)}</text>`;
    }
  }

  const svgH = h + guardExtend + textH;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${svgH}" viewBox="0 0 ${w} ${svgH}"><rect width="${w}" height="${svgH}" fill="#fff"/><g fill="#000" font-family="monospace">${rects}${texts}</g></svg>`;
}
