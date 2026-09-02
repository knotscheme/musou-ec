/**
 * 画像内の「テキストらしい領域」の面積比を推定する軽量ヒューリスティック。
 * WebGPU/AI を使わず、Canvas のピクセルデータからエッジ密度・局所コントラスト・
 * 明暗の二極性でセル単位に判定する。あくまで目安（誤検出あり）。
 */

export interface RatioResult {
  ratio: number; // 0..1
  cols: number;
  rows: number;
  cell: number; // セル一辺px（解析解像度基準）
  textCells: boolean[]; // 長さ cols*rows
  analyzeW: number;
  analyzeH: number;
}

export interface RatioOptions {
  /** 感度 0..100（大きいほど検出が緩い＝多めに拾う） */
  sensitivity?: number;
}

export function analyzeTextRatio(img: HTMLImageElement, opts: RatioOptions = {}): RatioResult {
  const sens = Math.min(100, Math.max(0, opts.sensitivity ?? 50));
  // 解析用に長辺 320px へ縮小
  const maxEdge = 320;
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  // グレースケール
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // 勾配（Sobel 簡易）
  const grad = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy =
        -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      grad[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // しきい値（感度で調整）
  const gradTh = 90 - (sens - 50) * 0.8; // 50→90, 100→50, 0→130
  const edgeFracTh = 0.14 - (sens - 50) * 0.0016; // 50→0.14
  const contrastTh = 38 - (sens - 50) * 0.25;
  const biPolarTh = 0.04 - (sens - 50) * 0.0004;

  const cell = 16;
  const cols = Math.max(1, Math.floor(w / cell));
  const rows = Math.max(1, Math.floor(h / cell));
  const textCells: boolean[] = new Array(cols * rows).fill(false);
  let textCount = 0;

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x0 = cx * cell, y0 = cy * cell;
      const x1 = Math.min(w, x0 + cell), y1 = Math.min(h, y0 + cell);
      let n = 0, edges = 0, sum = 0, sumSq = 0, dark = 0, light = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * w + x;
          const v = gray[i];
          n++;
          sum += v;
          sumSq += v * v;
          if (grad[i] > gradTh) edges++;
          if (v < 70) dark++;
          if (v > 190) light++;
        }
      }
      if (n === 0) continue;
      const mean = sum / n;
      const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
      const edgeFrac = edges / n;
      const bipolar = Math.min(dark, light) / n;
      if (edgeFrac > edgeFracTh && std > contrastTh && bipolar > biPolarTh) {
        textCells[cy * cols + cx] = true;
        textCount++;
      }
    }
  }

  return {
    ratio: textCount / (cols * rows),
    cols,
    rows,
    cell,
    textCells,
    analyzeW: w,
    analyzeH: h,
  };
}
