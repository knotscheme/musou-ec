"use client";

import { Hub } from "@/components/tools/_hub";
import RakutenPointSim from "@/components/tools/RakutenPointSim";
import YahooCouponSim from "@/components/tools/YahooCouponSim";
import ShopifyLoyalty from "@/components/tools/ShopifyLoyalty";
import CouponGuard from "@/components/tools/CouponGuard";

export default function DiscountSim() {
  return (
    <Hub
      slug="discount-sim"
      tabs={[
        { label: "楽天：ポイント原資", hint: "ポイント変倍・SPU・買い回りの付与原資と実質利益率。", Comp: RakutenPointSim },
        { label: "Yahoo：クーポン＋PayPay", hint: "ストアクーポン＋PayPay付与＋LYPプレミアムの合計原資と粗利。", Comp: YahooCouponSim },
        { label: "Shopify：ロイヤルティ", hint: "付与率×利用率×リピート増分から施策ROIと必要原資。", Comp: ShopifyLoyalty },
        { label: "赤字ガード（併用チェック）", hint: "クーポン＋ポイント＋セール価格の併用で赤字化する組み合わせを事前検知。", Comp: CouponGuard },
      ]}
    />
  );
}
