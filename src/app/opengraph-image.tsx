import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// output: "export" では、fetchを含む非同期routeは明示的に静的だと宣言する必要がある。
export const dynamic = "force-static";

/**
 * SNSシェア・検索結果用のOGP画像。output: "export" でもビルド時に静的PNGとして
 * 書き出される(next/ogのImageResponseはビルド時実行のため、フォントも
 * ビルド時にGoogle Fonts CDNから取得する。products/saas/spiderのように
 * リポジトリ同梱フォントを持たないため、この方式を採用)。
 */
async function loadNotoSansJPBold(): Promise<ArrayBuffer> {
  const cssRes = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@900&display=swap",
  );
  const css = await cssRes.text();
  const fontUrlMatch = css.match(/src: url\(([^)]+)\)/);
  if (!fontUrlMatch) throw new Error("Noto Sans JP font URL not found in Google Fonts CSS");
  const fontRes = await fetch(fontUrlMatch[1]);
  return fontRes.arrayBuffer();
}

const MALL_DOTS = [
  { label: "楽天市場", color: "#ffffff" },
  { label: "Yahoo!ショッピング", color: "#cdd9ff" },
  { label: "Amazon", color: "#ffdcb0" },
  { label: "Shopify", color: "#c7f3dc" },
];

export default async function OpengraphImage() {
  const fontData = await loadNotoSansJPBold();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #3730a3 0%, #6d28d9 55%, #a21caf 100%)",
          fontFamily: "Noto Sans JP",
        }}
      >
        <div style={{ display: "flex", color: "#ffffff", fontSize: 30, fontWeight: 900, opacity: 0.85 }}>
          完全無料 ・ ブラウザだけで完結
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 88, fontWeight: 900, letterSpacing: "-0.02em" }}>
            MUSOU-EC
          </div>
          <div style={{ display: "flex", color: "#f3e8ff", fontSize: 34, fontWeight: 900, lineHeight: 1.4 }}>
            楽天・Yahoo・Amazon・Shopify向け
          </div>
          <div style={{ display: "flex", color: "#f3e8ff", fontSize: 34, fontWeight: 900, lineHeight: 1.4 }}>
            EC支援ツール集
          </div>
        </div>

        <div style={{ display: "flex", gap: "14px" }}>
          {MALL_DOTS.map((mall) => (
            <div
              key={mall.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                borderRadius: "9999px",
                background: "rgba(255,255,255,0.14)",
              }}
            >
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 9999, background: mall.color }} />
              <div style={{ display: "flex", color: "#ffffff", fontSize: 22, fontWeight: 900 }}>{mall.label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Noto Sans JP", data: fontData, style: "normal", weight: 900 }],
    },
  );
}
