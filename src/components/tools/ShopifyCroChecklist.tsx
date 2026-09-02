"use client";

import { ToolShell } from "@/components/ToolShell";
import { Checklist, type CheckItem } from "@/components/Checklist";
import { recordHistory } from "@/lib/history";

const ITEMS: CheckItem[] = [
  { id: "fv-value", label: "ファーストビューで「何が・誰に・なぜ良いか」が伝わる", weight: 3, advice: "商品名だけでなく価値提案の一文を上部に。" },
  { id: "cta", label: "カート/購入ボタンが目立ち、スクロール後も追従する", weight: 3, advice: "色コントラストを確保し、モバイルは固定CTAを検討。" },
  { id: "price-clear", label: "価格・送料・納期が迷わず分かる", weight: 3, advice: "「送料無料」「◯日以内発送」を価格の近くに明記。" },
  { id: "reviews", label: "レビュー/評価が商品ページに表示されている", weight: 2, advice: "件数・星・代表的な声を上部に。ゼロ件なら初期レビュー施策。" },
  { id: "images", label: "画像が複数枚あり、ズーム・利用シーンが分かる", weight: 2, advice: "白背景＋着用/使用イメージ＋サイズ比較＋ディテール。" },
  { id: "spec", label: "サイズ・素材・仕様・同梱物が具体的に書かれている", weight: 2, advice: "表形式でスキャンしやすく。サイズ表は実寸で。" },
  { id: "faq", label: "よくある質問／不安要素の解消コンテンツがある", weight: 2, advice: "返品・洗濯・保証・在庫など購入前の不安をFAQで先回り。" },
  { id: "trust", label: "返品保証・決済ロゴなど安心材料が見える", weight: 1, advice: "「30日返品OK」等のバッジと主要決済アイコンを近接配置。" },
  { id: "urgency", label: "在庫・数量・期間などの適切な訴求がある", weight: 1, advice: "誇大にならない範囲で残数や販売期間を提示。" },
  { id: "related", label: "関連商品・セット・クロスセルの導線がある", weight: 1, advice: "同時購入されやすい商品や増量セットを提案。" },
  { id: "mobile-ux", label: "モバイルで文字サイズ・タップ領域・読み込みが快適", weight: 2, advice: "実機で確認。画像重量とアプリ埋め込みを最適化。" },
  { id: "cart-recovery", label: "カゴ落ちメール（フロー）が設定されている", weight: 2, advice: "1時間後/24時間後/72時間後の3通を用意（別ツールで生成可）。" },
  { id: "search", label: "サイト内検索・絞り込みが機能している", weight: 1, advice: "検索候補・在庫切れ除外・関連語対応を確認。" },
  { id: "copy", label: "CTA文言が具体的（「カートに入れる」等）で一貫している", weight: 1, advice: "曖昧な「詳しく」より行動を促す文言に統一。" },
];

export default function ShopifyCroChecklist() {
  return (
    <ToolShell slug="shopify-cro-checklist">
      <p className="text-sm text-[var(--muted)]">
        商品ページのCVRに効く要素を採点。未達項目を改善インパクトの大きい順（重み順）に潰す。
      </p>
      <Checklist
        items={ITEMS}
        onScore={(s) => s >= 80 && recordHistory("shopify-cro-checklist", `CROスコア ${s}`, "良好圏")}
      />
    </ToolShell>
  );
}
