/**
 * モール横断の正規化フィールドと、各モールCSVでの列名（別名）対応。
 * 変換・商品マスター展開の共通スキーマ。実カラム名は店舗設定で差があるため
 * 「目安」として扱い、UI 側で調整できるようにする。
 */

export type CanonKey =
  | "code"
  | "name"
  | "catchcopy"
  | "price"
  | "listPrice"
  | "stock"
  | "jan"
  | "brand"
  | "material"
  | "size"
  | "weight"
  | "color"
  | "description"
  | "image1"
  | "image2"
  | "image3"
  | "category"
  | "cost";

export const CANON_LABEL: Record<CanonKey, string> = {
  code: "商品コード / SKU",
  name: "商品名",
  catchcopy: "キャッチコピー",
  price: "販売価格",
  listPrice: "参考価格 / 二重価格",
  stock: "在庫数",
  jan: "JANコード",
  brand: "ブランド",
  material: "素材",
  size: "サイズ",
  weight: "重量",
  color: "カラー",
  description: "商品説明",
  image1: "画像URL 1",
  image2: "画像URL 2",
  image3: "画像URL 3",
  category: "カテゴリ",
  cost: "原価（社内用）",
};

export type MallFormat = "rakuten" | "yahoo" | "amazon" | "shopify";

export const FORMAT_LABEL: Record<MallFormat, string> = {
  rakuten: "楽天 item.csv",
  yahoo: "Yahoo 商品データ",
  amazon: "Amazon 在庫ファイル",
  shopify: "Shopify product CSV",
};

/** 各フォーマットでの列名（先頭が既定の出力列名、以降は入力検出用の別名） */
export const FORMAT_COLUMNS: Record<MallFormat, Partial<Record<CanonKey, string[]>>> = {
  rakuten: {
    code: ["商品管理番号（商品URL）", "商品管理番号", "管理番号"],
    name: ["商品名"],
    catchcopy: ["キャッチコピー"],
    price: ["販売価格", "表示価格"],
    listPrice: ["二重価格文言", "参考価格"],
    stock: ["在庫数", "在庫"],
    jan: ["JANコード", "JAN"],
    description: ["PC用商品説明文", "商品説明文", "スマートフォン用商品説明文"],
    image1: ["商品画像URL1", "画像URL1"],
    image2: ["商品画像URL2", "画像URL2"],
    image3: ["商品画像URL3", "画像URL3"],
    category: ["表示先カテゴリ", "ジャンルID", "カテゴリ"],
  },
  yahoo: {
    code: ["code", "商品コード"],
    name: ["name", "商品名"],
    catchcopy: ["headline", "キャッチコピー", "abstract"],
    price: ["price", "販売価格"],
    listPrice: ["sale-price", "参考価格", "元値"],
    stock: ["quantity", "在庫数"],
    jan: ["jan", "product-code", "isbn-code"],
    brand: ["brand", "ブランド"],
    description: ["caption", "explanation", "商品説明"],
    image1: ["image-path", "画像パス"],
    category: ["product-category", "path", "category-id"],
  },
  amazon: {
    code: ["seller-sku", "sku", "出品者SKU"],
    name: ["item-name", "商品名", "product-name"],
    price: ["price", "standard-price", "価格"],
    stock: ["quantity", "在庫", "数量"],
    jan: ["external-product-id", "product-id", "JAN"],
    brand: ["brand", "brand-name", "ブランド名"],
    description: ["product-description", "商品説明"],
    image1: ["main-image-url", "メイン画像URL"],
    image2: ["other-image-url1"],
    image3: ["other-image-url2"],
    category: ["recommended-browse-nodes", "item-type", "商品タイプ"],
  },
  shopify: {
    code: ["Variant SKU", "Handle", "SKU"],
    name: ["Title", "商品名"],
    price: ["Variant Price", "Price"],
    listPrice: ["Variant Compare At Price", "Compare At Price"],
    stock: ["Variant Inventory Qty", "Inventory Qty"],
    jan: ["Variant Barcode", "Barcode"],
    brand: ["Vendor", "ベンダー"],
    description: ["Body (HTML)", "Body HTML", "商品説明"],
    image1: ["Image Src", "Image"],
    category: ["Product Category", "Type", "Tags"],
  },
};

export const CANON_ORDER: CanonKey[] = [
  "code", "name", "catchcopy", "price", "listPrice", "stock", "jan",
  "brand", "material", "size", "weight", "color", "description",
  "image1", "image2", "image3", "category", "cost",
];
