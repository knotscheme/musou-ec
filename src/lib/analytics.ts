import { getOwnerId } from "./guest";

/**
 * Spider運営者コンソールの「無双ECアナリティクス」向け、軽量なツールアクセス計測。
 * 無双EC自体はバックエンド・DBを持たない完全静的サイトのため、Spider側に新設した
 * 公開エンドポイント(/api/musou-ec/track)へビーコン送信する形で記録する。
 *
 * visitorIdはguest.tsのgetOwnerId()(既存のゲスト仮ID/会員ID)をそのまま使う
 * (新たに別のID発行の仕組みを増やさない)。
 *
 * sendBeaconはJS側でレスポンスを読めないfire-and-forestのため、CORSプリフライトを
 * 発生させないよう本文はtext/plainのBlobとして送る(Spider側のroute.tsがtext()で
 * 受け取ってJSON.parseする実装と対になっている)。ページ表示・動作には一切影響させない。
 */
const TRACK_URL = "https://spider-ec.com/api/musou-ec/track";

export function trackToolView(toolSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({ tool: toolSlug, visitorId: getOwnerId() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(TRACK_URL, new Blob([payload], { type: "text/plain" }));
    } else {
      void fetch(TRACK_URL, { method: "POST", body: payload, keepalive: true, mode: "no-cors" });
    }
  } catch {
    // 計測の失敗がツールの表示・動作に一切影響しないようにする。
  }
}
