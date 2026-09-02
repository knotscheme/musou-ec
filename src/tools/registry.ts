import type { ComponentType } from "react";
import ImageResize from "@/components/tools/ImageResize";
import NgWordChecker from "@/components/tools/NgWordChecker";
import BarcodeGenerator from "@/components/tools/BarcodeGenerator";
import CouponGuard from "@/components/tools/CouponGuard";
import KeywordExpand from "@/components/tools/KeywordExpand";
import RakutenPointSim from "@/components/tools/RakutenPointSim";
import YahooItemreach from "@/components/tools/YahooItemreach";
import YahooDeliverySeo from "@/components/tools/YahooDeliverySeo";
import AmazonBreakeven from "@/components/tools/AmazonBreakeven";
import AmazonListingAudit from "@/components/tools/AmazonListingAudit";
import SiteSpeed from "@/components/tools/SiteSpeed";
import ShopifyLtvSub from "@/components/tools/ShopifyLtvSub";
import YahooCouponSim from "@/components/tools/YahooCouponSim";
import YahooAbandoned from "@/components/tools/YahooAbandoned";
import AmazonStorageFee from "@/components/tools/AmazonStorageFee";
import AmazonRepricingFloor from "@/components/tools/AmazonRepricingFloor";
import AmazonRestock from "@/components/tools/AmazonRestock";
import ShopifyStorefrontChecklist from "@/components/tools/ShopifyStorefrontChecklist";
import ShopifyCroChecklist from "@/components/tools/ShopifyCroChecklist";
import ShopifyLoyalty from "@/components/tools/ShopifyLoyalty";
import ShopifyAbandonedCart from "@/components/tools/ShopifyAbandonedCart";
import ShippingLineSim from "@/components/tools/ShippingLineSim";
import RakutenReviewFollowup from "@/components/tools/RakutenReviewFollowup";
import AmazonA9Keyword from "@/components/tools/AmazonA9Keyword";
import YahooNameSeo from "@/components/tools/YahooNameSeo";
import RakutenGenreKeyword from "@/components/tools/RakutenGenreKeyword";
import RakutenSalePrice from "@/components/tools/RakutenSalePrice";
import RakutenRmsCsv from "@/components/tools/RakutenRmsCsv";
import FollowupMessage from "@/components/tools/FollowupMessage";
import ImageMultisize from "@/components/tools/ImageMultisize";
import ImageBadge from "@/components/tools/ImageBadge";
import ReviewAnalyzer from "@/components/tools/ReviewAnalyzer";
import AiDescription from "@/components/tools/AiDescription";
import CsvMallConverter from "@/components/tools/CsvMallConverter";
import ProductMaster from "@/components/tools/ProductMaster";
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

/**
 * 実装済みツールの slug → コンポーネント対応。
 * ここに無い slug は MockTool（開発中）にフォールバックする。
 * malls.ts 側では対応ツールに status: "live" を付けること。
 */
export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  "image-resize": ImageResize,
  "ng-word-checker": NgWordChecker,
  "barcode-generator": BarcodeGenerator,
  "coupon-guard": CouponGuard,
  "keyword-expand": KeywordExpand,
  "rakuten-point-sim": RakutenPointSim,
  "yahoo-itemreach": YahooItemreach,
  "yahoo-delivery-seo": YahooDeliverySeo,
  "amazon-breakeven": AmazonBreakeven,
  "amazon-listing-audit": AmazonListingAudit,
  "site-speed": SiteSpeed,
  "shopify-ltv-sub": ShopifyLtvSub,
  "yahoo-coupon-sim": YahooCouponSim,
  "yahoo-abandoned": YahooAbandoned,
  "amazon-storage-fee": AmazonStorageFee,
  "amazon-repricing-floor": AmazonRepricingFloor,
  "amazon-restock": AmazonRestock,
  "shopify-storefront-checklist": ShopifyStorefrontChecklist,
  "shopify-cro-checklist": ShopifyCroChecklist,
  "shopify-loyalty": ShopifyLoyalty,
  "shopify-abandoned-cart": ShopifyAbandonedCart,
  "shipping-line-sim": ShippingLineSim,
  "rakuten-review-followup": RakutenReviewFollowup,
  "amazon-a9-keyword": AmazonA9Keyword,
  "yahoo-name-seo": YahooNameSeo,
  "rakuten-genre-keyword": RakutenGenreKeyword,
  "rakuten-sale-price": RakutenSalePrice,
  "rakuten-rms-csv": RakutenRmsCsv,
  "followup-message": FollowupMessage,
  "image-multisize": ImageMultisize,
  "image-badge": ImageBadge,
  "review-analyzer": ReviewAnalyzer,
  "ai-description": AiDescription,
  "csv-mall-converter": CsvMallConverter,
  "product-master": ProductMaster,
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
};
