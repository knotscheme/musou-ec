"use client";

import { Hub } from "@/components/tools/_hub";
import RakutenReviewFollowup from "@/components/tools/RakutenReviewFollowup";
import YahooAbandoned from "@/components/tools/YahooAbandoned";
import ShopifyAbandonedCart from "@/components/tools/ShopifyAbandonedCart";
import FollowupMessage from "@/components/tools/FollowupMessage";

export default function MessageGen() {
  return (
    <Hub
      slug="message-gen"
      tabs={[
        { label: "レビュー・買い回り訴求", hint: "RMSメルマガ／ステップメール用の文面。", Comp: RakutenReviewFollowup },
        { label: "カート・お気に入り落ち（Yahoo）", hint: "離脱ユーザー向けクーポン設計＋訴求文（利益影響つき）。", Comp: YahooAbandoned },
        { label: "カゴ落ちリカバリー3通", hint: "1時間後／24時間後／72時間後の3通をトーン別に一括生成。", Comp: ShopifyAbandonedCart },
        { label: "フォローメール／SMS", hint: "サンクス・到着確認・レビュー依頼・リピート促進を配信タイミング別に。", Comp: FollowupMessage },
      ]}
    />
  );
}
