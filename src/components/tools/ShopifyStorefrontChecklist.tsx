"use client";

import { ToolShell } from "@/components/ToolShell";
import { Checklist, type CheckItem } from "@/components/Checklist";
import { recordHistory } from "@/lib/history";

const ITEMS: CheckItem[] = [
  { id: "tokushoho", label: "特定商取引法に基づく表記ページがある", weight: 3, advice: "事業者名・住所・電話・返品条件など必須項目を漏れなく記載（法的必須）。" },
  { id: "privacy", label: "プライバシーポリシーがある", weight: 2, advice: "個人情報の利用目的・第三者提供・問い合わせ先を明記。" },
  { id: "returns", label: "返品・交換ポリシーを明示している", weight: 2, advice: "期限・条件・送料負担・手続きを具体的に。CVRと信頼に直結。" },
  { id: "shipping", label: "送料・配送日数を分かりやすく提示している", weight: 2, advice: "地域別送料・発送目安・追跡可否をヘッダーや商品ページ近くに。" },
  { id: "payment", label: "支払い方法を明記している", weight: 1, advice: "クレカ・後払い・キャリア決済など対応手段をフッターに。" },
  { id: "ssl", label: "全ページ https（SSL）で表示される", weight: 2, advice: "Shopify標準でSSLは有効。独自ドメインの証明書発行完了を確認。" },
  { id: "domain", label: "独自ドメインを設定している", weight: 1, advice: "myshopify.com のままは信頼性・ブランドで不利。" },
  { id: "contact", label: "問い合わせ導線（フォーム/チャット/メール）がある", weight: 2, advice: "購入前の不安を解消できる導線を分かりやすい位置に。" },
  { id: "ga4", label: "GA4（計測）を設置している", weight: 2, advice: "GA4 + Shopify標準レポートで流入・CVRを把握できる状態に。" },
  { id: "gsc", label: "Search Console にサイト登録・サイトマップ送信済み", weight: 1, advice: "sitemap.xml を送信し、インデックス状況を監視。" },
  { id: "meta", label: "主要ページの title / meta description を設定している", weight: 1, advice: "トップ・主要コレクション・売れ筋商品は手動で最適化。" },
  { id: "ogp", label: "favicon・OGP画像を設定している", weight: 1, advice: "SNS共有時の見え方とタブ表示を整える。" },
  { id: "inventory", label: "在庫0時の表示（入荷通知/売り切れ）を設計している", weight: 1, advice: "「在庫切れ」の見せ方と再入荷通知アプリの検討。" },
  { id: "mobile", label: "スマホ実機で全導線を確認した", weight: 2, advice: "実機でカート→決済まで通し、崩れ・タップ領域を確認。" },
  { id: "checkout", label: "テスト注文で決済〜注文確認メールまで確認した", weight: 3, advice: "Bogus Gateway かテストモードで一連を検証。メール文面も確認。" },
  { id: "cookie", label: "必要地域向けの同意管理（Cookieバナー）を設定した", weight: 1, advice: "EU等へ販売するなら同意バナー・GA同意モードを設定。" },
  { id: "jsonld", label: "商品ページに構造化データ（Product）が出力される", weight: 1, advice: "テーマ標準が不十分なら JSON-LD を追加（別ツールで生成可）。" },
  { id: "images", label: "主要商品に複数枚の画像（利用シーン含む）がある", weight: 1, advice: "白背景メイン＋利用シーン＋サイズ比較を最低3枚。" },
];

export default function ShopifyStorefrontChecklist() {
  return (
    <ToolShell slug="shopify-storefront-checklist">
      <p className="text-sm text-[var(--muted)]">
        公開前・リニューアル前の必須項目。法定表記・計測・決済まわりを中心に点検する。
      </p>
      <Checklist
        items={ITEMS}
        onScore={(s, ids) => s === 100 && recordHistory("shopify-storefront-checklist", "全項目クリア", `${ids.length}項目`)}
      />
    </ToolShell>
  );
}
