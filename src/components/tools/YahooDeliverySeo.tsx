"use client";

import { ToolShell } from "@/components/ToolShell";
import { Checklist, type CheckItem } from "@/components/Checklist";
import { recordHistory } from "@/lib/history";

const ITEMS: CheckItem[] = [
  {
    id: "leadtime",
    label: "出荷リードタイムを「1〜2日以内」に設定している",
    weight: 3,
    advice: "リードタイム短縮が優良配送判定の中心。倉庫運用を見直し1〜2日出荷へ。",
  },
  {
    id: "weekend",
    label: "土日祝の出荷に対応している",
    weight: 2,
    advice: "土日出荷なしは「早く届く」判定に不利。委託倉庫やRSL活用を検討。",
  },
  {
    id: "stocksync",
    label: "在庫連動を設定し、欠品・注文後キャンセルを抑えている",
    weight: 2,
    advice: "出荷遅延・キャンセル率は優良配送の維持条件。在庫連動を必須化。",
  },
  {
    id: "rsl",
    label: "「あすつく」またはYahooのRSL/優良配送提携倉庫を利用している",
    weight: 2,
    advice: "自社出荷で条件維持が難しい場合はRSL等の外部倉庫が近道。",
  },
  {
    id: "datetime",
    label: "配送日時指定に対応している",
    weight: 1,
    advice: "日時指定対応は購入体験・レビュー評価に寄与。配送設定を確認。",
  },
  {
    id: "freeship",
    label: "送料無料ライン（または送料無料）を設定している",
    weight: 1,
    advice: "送料無料は検索の絞り込み・CVRに影響。無料ラインの利益影響を試算のうえ設定。",
  },
  {
    id: "pageinfo",
    label: "商品ページに「お届け目安」を明記している",
    weight: 1,
    advice: "配送目安の明記は不安解消とキャンセル抑止に有効。",
  },
  {
    id: "ratio",
    label: "優良配送アイコン付き商品が主要SKUの大半を占める",
    weight: 2,
    advice: "一部商品だけでなく、売れ筋全体で条件を満たすとストア全体の露出が伸びる。",
  },
  {
    id: "delayrate",
    label: "直近の出荷遅延率・キャンセル率が基準内（社内で数値管理している）",
    weight: 2,
    advice: "遅延/キャンセルの実績値を週次で確認し、閾値超過をアラートする運用に。",
  },
];

export default function YahooDeliverySeo() {
  return (
    <ToolShell slug="yahoo-delivery-seo">
      <p className="text-sm text-[var(--muted)]">
        Yahoo!ショッピングの検索は「優良配送を優先表示するおすすめ順」。以下の付与・維持条件を自己点検する。
      </p>
      <Checklist
        items={ITEMS}
        onScore={(score, ids) =>
          score === 100 &&
          recordHistory("yahoo-delivery-seo", "全項目クリア", `${ids.length}項目`)
        }
      />
    </ToolShell>
  );
}
