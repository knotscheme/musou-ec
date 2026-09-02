/**
 * 画像ファイルを縮小して data: URL 化する（サーバー不要）。
 * ページビルダーのドラッグ&ドロップ画像取り込み用。
 * data URL は HTML が肥大化するため、本番は画像URL指定を推奨。
 */
export function fileToDataUrl(file: File, maxEdge = 1400, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("画像ファイルではありません"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("canvas 未対応"));
      ctx.drawImage(img, 0, 0, w, h);
      const isPng = /png$/i.test(file.type);
      resolve(canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = url;
  });
}
