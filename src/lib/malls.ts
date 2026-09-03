/**
 * モール定義とツールレジストリ。
 * サイドナビ・ダッシュボード・各ツールページの見出し／アイコンがすべてここを参照する。
 *
 * ツール選定方針（2026-09 リサーチ反映）:
 *   モール標準機能・公式無料ツールで解決できるものは載せない。
 *   例) Shopify の翻訳は公式「Translate & Adapt」が2言語まで無料 → CSV多言語翻訳ツールは廃止。
 *       Amazon の FBA 料金計算は公式シミュレーターが無料 → 単純計算は載せず「広告ACoS込みの
 *       損益分岐」「返品・保管を差し引いた実利益」など公式が扱わない領域に寄せる。
 *       Yahoo は2025/8にアイテムマッチ→アイテムリーチ広告へ移行 → 名称を更新。
 *   逆に「モール横断」の作業（CSV項目変換・売上/粗利の串刺し集計・レビュー横断分析）は
 *   無料ツールが手薄なため共通カテゴリで厚めに用意する。
 *   重複していた小ツールは統合ハブ（image-studio / discount-sim / message-gen / title-seo /
 *   data-hub）にタブでまとめている。
 */

export type MallId = "rakuten" | "yahoo" | "amazon" | "shopify" | "common";

export interface Mall {
  id: MallId;
  label: string;
  /** カラーリングによる視覚的区別（要件3）。HEX。 */
  color: string;
  colorSoft: string;
}

export const MALLS: Record<MallId, Mall> = {
  rakuten: { id: "rakuten", label: "楽天市場", color: "#bf0000", colorSoft: "#f6dede" },
  yahoo: { id: "yahoo", label: "Yahoo!ショッピング", color: "#0f4fd6", colorSoft: "#dbe5fb" },
  amazon: { id: "amazon", label: "Amazon", color: "#e47911", colorSoft: "#fbe7d2" },
  shopify: { id: "shopify", label: "Shopify / 自社サイト", color: "#1a8a5a", colorSoft: "#d6efe3" },
  common: { id: "common", label: "全店舗共通", color: "#5b6472", colorSoft: "#e4e6ea" },
};

export const MALL_ORDER: MallId[] = ["rakuten", "yahoo", "amazon", "shopify", "common"];

export type ToolKind =
  | "client" // ブラウザ内で完結（Canvas / WASM / Web Workers）
  | "byok" // ユーザーの API キーが必要
  | "extension"; // Chrome 拡張機能が必要（MVP はスタブ + 手動貼り付け）

/** 稼働中 = 実装済みで使える / 開発中 = モック（優先度アンケートの対象） */
export type ToolStatus = "live" | "wip";

export interface Tool {
  slug: string;
  mall: MallId;
  name: string;
  summary: string;
  kind: ToolKind;
  /** ToolIcon のアイコン名 */
  icon: string;
  /** 省略時は "wip"（開発中）。実装が済んだツールだけ "live" を明示する。 */
  status?: ToolStatus;
  /** 別サービス（外部URL）へのリンクの場合。自前のツールページは持たない。 */
  external?: string;
  /** external カードの枠・背景に使う強調色（省略時はモール色）。 */
  accent?: string;
}

export const getStatus = (t: Tool): ToolStatus => t.status ?? "wip";

export const STATUS_LABEL: Record<ToolStatus, string> = {
  live: "稼働中",
  wip: "開発中",
};

export const STATUS_COLOR: Record<ToolStatus, string> = {
  live: "#1a8a5a",
  wip: "#a1701c",
};

export const TOOLS: Tool[] = [
  // ── 楽天市場 ──────────────────────────────
  {
    slug: "rakuten-page-builder",
    mall: "rakuten",
    name: "ノーコード トップページビルダー（楽天GOLD）",
    summary:
      "楽天GOLDのトップ/特集ページをドラッグ&ドロップで作成。見出し・画像・2カラム・バナー・ボタン等のブロックを並べ、index.html + style.css をZIP出力。",
    kind: "client",
    icon: "layout",
    status: "live",
  },
  {
    slug: "image-text-ratio",
    mall: "rakuten",
    name: "サムネイル一括テキスト占有率チェック",
    summary: "フォルダごと一括で判定。楽天20%ガイドラインをNG/要注意/OKに仕分け・CSV出力。出品前プリフライト用。",
    kind: "client",
    icon: "image",
    status: "live",
  },
  {
    slug: "rakuten-rms-csv",
    mall: "rakuten",
    name: "RMS商品CSV一括編集ツール",
    summary: "RMS の item.csv を読み込み、価格・在庫・キャッチコピー・SKUを一括置換して書き出し。",
    kind: "client",
    icon: "table",
    status: "live",
  },
  {
    slug: "rakuten-sale-price",
    mall: "rakuten",
    name: "セール価格 一括計算＆CSV生成",
    summary:
      "通常価格から割引率・二重価格・ポイント変倍原資を一括反映し、送信予約用の item.csv を出力。スーパーSALE準備を数百商品まとめて。",
    kind: "client",
    icon: "ticket",
    status: "live",
  },
  {
    slug: "rakuten-suggest",
    mall: "rakuten",
    name: "楽天サジェスト抽出ツール",
    summary: "楽天の検索サジェストを深堀り取得し CSV でダウンロード。拡張機能（準備中）から分散取得。",
    kind: "extension",
    icon: "search",
    status: "wip",
  },
  {
    slug: "rank-tracker",
    mall: "rakuten",
    name: "検索順位自動計測ツール",
    summary: "登録キーワードの検索順位を定期取得し推移をローカル保存。拡張機能（準備中）から実行。",
    kind: "extension",
    icon: "chart",
    status: "wip",
  },
  {
    slug: "rakuten-competitor",
    mall: "rakuten",
    name: "競合店舗リサーチ",
    summary: "競合商品ページから価格・ポイント・レビュー数/評価・ランキングを取得し比較表化。拡張機能（準備中）連携。",
    kind: "extension",
    icon: "users",
    status: "wip",
  },

  // ── Yahoo!ショッピング ────────────────────
  {
    slug: "yahoo-page-builder",
    mall: "yahoo",
    name: "ノーコード トップページビルダー（Yahoo!ストア）",
    summary:
      "Yahoo!ストアのトップ/カテゴリページ用HTMLをドラッグ&ドロップで作成。ブロックを並べてプレビュー、1ファイルHTMLをコピーしてストアクリエイターProに貼り付け。",
    kind: "client",
    icon: "layout",
    status: "live",
  },
  {
    slug: "yahoo-itemreach",
    mall: "yahoo",
    name: "アイテムリーチ広告 入札シミュレーター",
    summary: "2025/8移行の新広告に対応。入札単価・CVR・客単価から損益分岐ROASと推奨入札額を試算。",
    kind: "client",
    icon: "target",
    status: "live",
  },
  {
    slug: "yahoo-delivery-seo",
    mall: "yahoo",
    name: "優良配送SEOチェッカー",
    summary: "優良配送の付与条件と「優先表示おすすめ順」への影響要因をチェックリストで自己診断。",
    kind: "client",
    icon: "truck",
    status: "live",
  },
  {
    slug: "yahoo-item-csv",
    mall: "yahoo",
    name: "商品データ（CSV）項目チェッカー",
    summary: "Yahoo 商品CSV の必須項目欠落・文字数超過・禁止語・プロダクトカテゴリ未設定を検査。",
    kind: "client",
    icon: "clipboard",
    status: "live",
  },
  {
    slug: "yahoo-price-sync",
    mall: "yahoo",
    name: "他モール価格 差分チェッカー",
    summary:
      "楽天/Amazon の価格CSVを読み込み、PayPay還元込みの実質価格で横並び比較。Yahoo の価格改定候補を提示。",
    kind: "client",
    icon: "cycle",
    status: "live",
  },
  {
    slug: "yahoo-campaign-calendar",
    mall: "yahoo",
    name: "販促カレンダー＆原資プランナー",
    summary:
      "5のつく日・ゾロ目の日・LYP感謝祭など年間イベントを一覧化し、各回のクーポン/ポイント原資と目標粗利を計画。",
    kind: "client",
    icon: "calendar",
    status: "live",
  },
  {
    slug: "yahoo-product-category",
    mall: "yahoo",
    name: "プロダクトカテゴリ 一括判定ツール",
    summary: "商品CSVの各行に対しプロダクトカテゴリ/カテゴリIDを推定付与。検索露出に効く必須設定を効率化。",
    kind: "client",
    icon: "grid",
    status: "live",
  },

  // ── Amazon ───────────────────────────────
  {
    slug: "amazon-breakeven",
    mall: "amazon",
    name: "損益分岐・広告ACoSシミュレーター",
    summary: "公式FBAシミュレーターが扱わない領域。手数料込みの損益分岐ACoS・値下げ耐性・目標TACoSを算出。",
    kind: "client",
    icon: "calculator",
    status: "live",
  },
  {
    slug: "amazon-true-profit",
    mall: "amazon",
    name: "本当の利益ダッシュボード",
    summary: "売上レポートCSVに販売手数料・広告費・返品・長期保管の隠れコストを当てて商品別の実利益を可視化。",
    kind: "client",
    icon: "coins",
    status: "live",
  },
  {
    slug: "amazon-storage-fee",
    mall: "amazon",
    name: "在庫保管・長期在庫サーチャージ シミュレーター",
    summary: "サイズ・数量・保管月数から在庫保管手数料と長期在庫（181日/271日超）サーチャージを試算。",
    kind: "client",
    icon: "box",
    status: "live",
  },
  {
    slug: "amazon-listing-audit",
    mall: "amazon",
    name: "商品ページ品質チェッカー",
    summary: "タイトル長・箇条書き数・画像枚数・A+有無・レビュー数などをスコア化し改善点を提示。",
    kind: "client",
    icon: "clipboard",
    status: "live",
  },
  {
    slug: "amazon-repricing-floor",
    mall: "amazon",
    name: "価格改定 下限価格シミュレーター",
    summary:
      "セラーセントラルが扱えない原価を登録し、目標利益率から『これ以上下げてはいけない価格』を全SKU一括算出。CSV出力。",
    kind: "client",
    icon: "coins",
    status: "live",
  },
  {
    slug: "amazon-restock",
    mall: "amazon",
    name: "FBA在庫 発注点・発注量シミュレーター",
    summary: "販売速度×リードタイム×安全在庫で発注点と推奨発注量を計算。欠品と過剰在庫（保管費）を同時に防ぐ。",
    kind: "client",
    icon: "box",
    status: "live",
  },
  {
    slug: "amazon-ppc-negative",
    mall: "amazon",
    name: "スポンサー広告 除外KW抽出ツール",
    summary: "検索用語レポートCSVから ACoS 過大・クリックのみ/CV0 の語を抽出し、除外キーワードリストを生成。",
    kind: "client",
    icon: "search",
    status: "live",
  },
  {
    slug: "amazon-return-analyzer",
    mall: "amazon",
    name: "返品レポート分析ツール",
    summary: "返品レポートCSVから商品別の返品率・理由内訳を集計し、対策の優先度と想定損失を提示。",
    kind: "client",
    icon: "cycle",
    status: "live",
  },

  // ── Shopify / 自社サイト ──────────────────
  {
    slug: "web-template-studio",
    mall: "shopify",
    name: "Splicer（セクションテンプレート）",
    summary:
      "直感でカスタム、一瞬でLiquid。Shopify構築を加速する、無料のセクションテンプレート集。（別サービス・新しいタブで開きます）",
    kind: "client",
    icon: "layout",
    status: "live",
    external: "https://web-template-studio.knotscheme.workers.dev/",
  },
  {
    slug: "site-speed",
    mall: "shopify",
    name: "サイト表示スピード診断",
    summary: "URLを入れると PageSpeed Insights で自動計測。Core Web Vitals（LCP/CLS/INP）のしきい値判定と改善優先度・テーマ観点の対策を提示。",
    kind: "client",
    icon: "gauge",
    status: "live",
  },
  {
    slug: "shopify-jsonld",
    mall: "shopify",
    name: "構造化データ（JSON-LD）ジェネレーター",
    summary: "既定テーマで不足しがちな Product / Review / FAQ / BreadcrumbList の JSON-LD を生成。",
    kind: "client",
    icon: "code",
    status: "live",
  },
  {
    slug: "shopify-bulk-seo",
    mall: "shopify",
    name: "商品CSV メタ情報一括生成",
    summary: "商品CSVから meta description・画像alt・OGP文言をまとめて生成（BYOK）。標準にない一括AI補完。",
    kind: "byok",
    icon: "tag",
    status: "live",
  },
  {
    slug: "shopify-storefront-checklist",
    mall: "shopify",
    name: "開店前チェックリスト",
    summary: "特商法・返品ポリシー・SSL・構造化データ・GA4/計測・同意管理など公開前の必須項目を自己点検。",
    kind: "client",
    icon: "clipboard",
    status: "live",
  },
  {
    slug: "shopify-ltv-sub",
    mall: "shopify",
    name: "定期購入LTV・許容CPAシミュレーター",
    summary: "継続率・平均継続回数・粗利から LTV を算出し、広告の上限CPAと初回赤字の許容ラインを提示。",
    kind: "client",
    icon: "cycle",
    status: "live",
  },
  {
    slug: "shopify-cro-checklist",
    mall: "shopify",
    name: "商品ページCRO診断",
    summary: "ファーストビュー・レビュー・FAQ・配送目安・不安要素の解消など、CVRに効く要素を採点し改善順を提示。",
    kind: "client",
    icon: "gauge",
    status: "live",
  },

  // ── 全店舗共通 ────────────────────────────
  {
    slug: "sayatori-ai",
    mall: "common",
    name: "サヤトリAI",
    summary:
      "見つけるのは勘じゃなく、データ。AIがX（旧Twitter）を中心としたSNSと検索データから、伸び始めたジャンルを検出し仕入れ候補まで自動で突き合わせます。（別サービス・新しいタブで開きます）",
    kind: "client",
    icon: "target",
    status: "live",
    external: "https://sayatori-ai.onrender.com/lp",
    accent: "#94a3b8",
  },
  // 統合ハブ（重複していた小ツールをタブでまとめたもの）
  {
    slug: "image-studio",
    mall: "common",
    name: "商品画像スタジオ",
    summary: "リサイズ・圧縮／画像結合（縦長づくり）／モール規定サイズ書き出し／帯・SALEバッジ合成 をタブでまとめた画像加工ツール。すべてブラウザ内処理。",
    kind: "client",
    icon: "crop",
    status: "live",
  },
  {
    slug: "discount-sim",
    mall: "common",
    name: "値引き・原資シミュレーター",
    summary: "楽天ポイント原資／Yahooクーポン＋PayPay／Shopifyロイヤルティ／併用の赤字ガード をモール別タブで。",
    kind: "client",
    icon: "calculator",
    status: "live",
  },
  {
    slug: "message-gen",
    mall: "common",
    name: "EC文面ジェネレーター",
    summary: "レビュー・買い回り訴求／カート落ち対策／カゴ落ち3通／フォローメール・SMS を状況別タブで生成。CSV差し込み対応。",
    kind: "client",
    icon: "mail",
    status: "live",
  },
  {
    slug: "title-seo",
    mall: "common",
    name: "商品名・キーワードSEO診断",
    summary: "楽天ジャンル別KW／Yahoo商品名SEO／Amazon A9キーワード をモール別ルールで採点・診断。",
    kind: "client",
    icon: "search",
    status: "live",
  },
  {
    slug: "data-hub",
    mall: "common",
    name: "商品データ変換ハブ",
    summary: "1件のマスター → 全モール項目へ展開／モール間の商品CSV相互変換 をタブでまとめた変換ツール。",
    kind: "client",
    icon: "convert",
    status: "live",
  },
  {
    slug: "profit-dashboard",
    mall: "common",
    name: "モール横断 売上・粗利ダッシュボード",
    summary: "各モールの売上CSVを読み込み、モール別手数料テーブルを当てて商品別・モール別の粗利を串刺し集計。",
    kind: "client",
    icon: "chart",
    status: "live",
  },
  {
    slug: "review-analyzer",
    mall: "common",
    name: "レビュー分析＆返信テンプレ",
    summary: "各モールのレビューを貼り付け→星別集計・頻出の不満/好評ワード抽出・返信文案（NG回答チェック付き）。",
    kind: "client",
    icon: "star",
    status: "live",
  },
  {
    slug: "ai-description",
    mall: "common",
    name: "AI商品説明文ジェネレーター",
    summary: "商品名・特徴から説明文を生成（BYOK：ユーザーの Gemini API キーを使用）。",
    kind: "byok",
    icon: "sparkles",
    status: "live",
  },
  {
    slug: "shipping-notice",
    mall: "common",
    name: "発送・遅延・欠品 連絡文ジェネレーター",
    summary:
      "発送完了／遅延お詫び／一部欠品・分割発送／海外発送 の連絡文を主要6言語で生成。配送業者の追跡URL自動生成・CSV差し込み対応。全モールのメール/配信ツールに貼れる。",
    kind: "client",
    icon: "truck",
    status: "live",
  },
  {
    slug: "ng-word-checker",
    mall: "common",
    name: "薬機法・景表法 NGワードチェッカー",
    summary: "商品説明・広告文の誇大表現／禁止表現を辞書照合でハイライトし言い換え候補を提示。",
    kind: "client",
    icon: "shield",
    status: "live",
  },
  {
    slug: "barcode-generator",
    mall: "common",
    name: "JAN/バーコード一括生成ツール",
    summary: "CSV の商品コードから JAN（EAN-13）バーコードSVG/PNGを一括生成。チェックデジット自動計算。",
    kind: "client",
    icon: "barcode",
    status: "live",
  },
  {
    slug: "shipping-line-sim",
    mall: "common",
    name: "送料設定・送料無料ライン シミュレーター",
    summary: "商品重量・サイズ・配送業者料金表から、送料無料ラインの設定額と利益・同梱率への影響を試算。",
    kind: "client",
    icon: "truck",
    status: "live",
  },
  {
    slug: "keyword-expand",
    mall: "common",
    name: "キーワード拡張＆共起語ツール",
    summary: "シード語から関連語・複合語・共起語を展開してCSV化。商品名・広告キーワードの元ネタ作りに。",
    kind: "client",
    icon: "search",
    status: "live",
  },
  {
    slug: "page-reverse",
    mall: "common",
    name: "ページ構成リバースエンジニアリング",
    summary: "競合商品ページの DOM 構成・見出し・画像枚数・文字数を抽出。拡張機能（準備中）連携。",
    kind: "extension",
    icon: "layers",
    status: "wip",
  },
];

export const toolsByMall = (mall: MallId): Tool[] => TOOLS.filter((t) => t.mall === mall);
export const getTool = (slug: string): Tool | undefined => TOOLS.find((t) => t.slug === slug);

export const KIND_LABEL: Record<ToolKind, string> = {
  client: "ブラウザ内処理",
  byok: "BYOK（APIキー必要）",
  extension: "Chrome拡張連携",
};
