"use client";

import { Hub } from "@/components/tools/_hub";
import ProductMaster from "@/components/tools/ProductMaster";
import CsvMallConverter from "@/components/tools/CsvMallConverter";

export default function DataHub() {
  return (
    <Hub
      slug="data-hub"
      tabs={[
        { label: "マスター → 全モール展開", hint: "1件のマスターデータを楽天/Yahoo/Amazon/Shopify の各項目へ変換してCSV・コピー出力。", Comp: ProductMaster },
        { label: "モール間CSV変換", hint: "楽天 item.csv ⇄ Yahoo ⇄ Amazon 在庫 ⇄ Shopify product CSV を項目マッピングして相互変換。", Comp: CsvMallConverter },
      ]}
    />
  );
}
