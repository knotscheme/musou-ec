import type { ComponentType } from "react";
import NgWordChecker from "@/components/tools/NgWordChecker";
import BarcodeGenerator from "@/components/tools/BarcodeGenerator";
import KeywordExpand from "@/components/tools/KeywordExpand";
import YahooItemreach from "@/components/tools/YahooItemreach";
import YahooDeliverySeo from "@/components/tools/YahooDeliverySeo";
import AmazonBreakeven from "@/components/tools/AmazonBreakeven";
import AmazonListingAudit from "@/components/tools/AmazonListingAudit";
import SiteSpeed from "@/components/tools/SiteSpeed";
import ShopifyLtvSub from "@/components/tools/ShopifyLtvSub";
import AmazonStorageFee from "@/components/tools/AmazonStorageFee";
import AmazonRepricingFloor from "@/components/tools/AmazonRepricingFloor";
import AmazonRestock from "@/components/tools/AmazonRestock";
import ShopifyStorefrontChecklist from "@/components/tools/ShopifyStorefrontChecklist";
import ShopifyCroChecklist from "@/components/tools/ShopifyCroChecklist";
import ShippingLineSim from "@/components/tools/ShippingLineSim";
import RakutenSalePrice from "@/components/tools/RakutenSalePrice";
import RakutenRmsCsv from "@/components/tools/RakutenRmsCsv";
import ReviewAnalyzer from "@/components/tools/ReviewAnalyzer";
import AiDescription from "@/components/tools/AiDescription";
import AmazonTrueProfit from "@/components/tools/AmazonTrueProfit";
import ProfitDashboard from "@/components/tools/ProfitDashboard";
import AmazonPpcNegative from "@/components/tools/AmazonPpcNegative";
import AmazonReturnAnalyzer from "@/components/tools/AmazonReturnAnalyzer";
import YahooItemCsv from "@/components/tools/YahooItemCsv";
import YahooCampaignCalendar from "@/components/tools/YahooCampaignCalendar";
import ShippingNotice from "@/components/tools/ShippingNotice";
import ShopifyJsonld from "@/components/tools/ShopifyJsonld";
import ImageTextRatio from "@/components/tools/ImageTextRatio";
import YahooPriceSync from "@/components/tools/YahooPriceSync";
import ShopifyBulkSeo from "@/components/tools/ShopifyBulkSeo";
import YahooProductCategory from "@/components/tools/YahooProductCategory";
import PageReverse from "@/components/tools/PageReverse";
import RakutenCompetitor from "@/components/tools/RakutenCompetitor";
import RakutenSuggest from "@/components/tools/RakutenSuggest";
import RankTracker from "@/components/tools/RankTracker";
import RakutenPageBuilder from "@/components/tools/RakutenPageBuilder";
import YahooPageBuilder from "@/components/tools/YahooPageBuilder";
// 統合ハブ（複数ツールをタブで内包）
import ImageStudio from "@/components/tools/ImageStudio";
import DiscountSim from "@/components/tools/DiscountSim";
import MessageGen from "@/components/tools/MessageGen";
import TitleSeo from "@/components/tools/TitleSeo";
import DataHub from "@/components/tools/DataHub";

/**
 * 実装済みツールの slug → コンポーネント対応。
 * ここに無い slug は MockTool（開発中）にフォールバックする。
 * malls.ts 側では対応ツールに status: "live" を付けること。
 */
export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  "ng-word-checker": NgWordChecker,
  "barcode-generator": BarcodeGenerator,
  "keyword-expand": KeywordExpand,
  "yahoo-itemreach": YahooItemreach,
  "yahoo-delivery-seo": YahooDeliverySeo,
  "amazon-breakeven": AmazonBreakeven,
  "amazon-listing-audit": AmazonListingAudit,
  "site-speed": SiteSpeed,
  "shopify-ltv-sub": ShopifyLtvSub,
  "amazon-storage-fee": AmazonStorageFee,
  "amazon-repricing-floor": AmazonRepricingFloor,
  "amazon-restock": AmazonRestock,
  "shopify-storefront-checklist": ShopifyStorefrontChecklist,
  "shopify-cro-checklist": ShopifyCroChecklist,
  "shipping-line-sim": ShippingLineSim,
  "rakuten-sale-price": RakutenSalePrice,
  "rakuten-rms-csv": RakutenRmsCsv,
  "review-analyzer": ReviewAnalyzer,
  "ai-description": AiDescription,
  "amazon-true-profit": AmazonTrueProfit,
  "profit-dashboard": ProfitDashboard,
  "amazon-ppc-negative": AmazonPpcNegative,
  "amazon-return-analyzer": AmazonReturnAnalyzer,
  "yahoo-item-csv": YahooItemCsv,
  "yahoo-campaign-calendar": YahooCampaignCalendar,
  "shipping-notice": ShippingNotice,
  "shopify-jsonld": ShopifyJsonld,
  "image-text-ratio": ImageTextRatio,
  "yahoo-price-sync": YahooPriceSync,
  "shopify-bulk-seo": ShopifyBulkSeo,
  "yahoo-product-category": YahooProductCategory,
  "page-reverse": PageReverse,
  "rakuten-competitor": RakutenCompetitor,
  "rakuten-suggest": RakutenSuggest,
  "rank-tracker": RankTracker,
  "rakuten-page-builder": RakutenPageBuilder,
  "yahoo-page-builder": YahooPageBuilder,
  // 統合ハブ
  "image-studio": ImageStudio,
  "discount-sim": DiscountSim,
  "message-gen": MessageGen,
  "title-seo": TitleSeo,
  "data-hub": DataHub,
};
