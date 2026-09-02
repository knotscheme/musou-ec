/**
 * ノーコード トップページビルダー：ブロック定義・テーマ・HTML/CSS 生成・テンプレート。
 * 「構成を選ぶ → フォント/テーマカラー → 各ブロックを細かく調整」フロー。
 * 楽天GOLD / Yahoo!ストア 向けの静的HTMLをブラウザ内処理で書き出す（無料）。
 */

// ── ブロック ───────────────────────────────
export type BlockType =
  | "hero" | "heading" | "richtext" | "text" | "image" | "image2col" | "image3col"
  | "banner" | "iconmenu" | "slideshow" | "productgrid" | "ranking" | "coupon"
  | "countdown" | "button" | "sns" | "spacer" | "divider" | "html"
  | "featurelist" | "steps" | "faq" | "reviews" | "notice"
  | "infobar" | "gallery" | "video" | "media" | "beforeafter" | "logos" | "tabs" | "accordion"
  | "spotlight" | "pricing" | "compare" | "stats" | "badges" | "rating" | "talk"
  | "timeline" | "recommend" | "calendar";

export type Visibility = "both" | "pc" | "sp";

export interface Block {
  id: string;
  type: BlockType;
  vis?: Visibility;
  props: Record<string, string>;
}

export const BLOCK_LABEL: Record<BlockType, string> = {
  hero: "ヒーロー（大バナー＋見出し）",
  heading: "見出し",
  richtext: "見出し＋リード文",
  text: "テキスト",
  image: "画像",
  image2col: "画像2カラム",
  image3col: "画像3カラム",
  banner: "バナー（横幅いっぱい）",
  iconmenu: "カテゴリアイコンメニュー",
  slideshow: "スライドショー",
  productgrid: "商品グリッド",
  ranking: "ランキング",
  coupon: "クーポン訴求",
  countdown: "カウントダウン",
  button: "ボタン",
  sns: "SNS埋め込み",
  spacer: "余白",
  divider: "区切り線",
  html: "HTML（上級者向け）",
  featurelist: "特徴リスト",
  steps: "ステップ（使い方・流れ）",
  faq: "よくある質問",
  reviews: "お客様の声",
  notice: "注意書き（小さい文字）",
  infobar: "お知らせバー（帯）",
  gallery: "ギャラリー（画像グリッド）",
  video: "動画（YouTube / MP4）",
  media: "画像＋テキスト（左右）",
  beforeafter: "ビフォー / アフター",
  logos: "ロゴ帯（取扱ブランド）",
  tabs: "タブ切り替え",
  accordion: "アコーディオン（開閉）",
  spotlight: "注目商品スポットライト",
  pricing: "料金プラン",
  compare: "比較表 / スペック表",
  stats: "実績カウンター（数字訴求）",
  badges: "安心バッジ帯",
  rating: "評価サマリー（★）",
  talk: "吹き出し会話",
  timeline: "スケジュール（タイムライン）",
  recommend: "こんな方におすすめ",
  calendar: "営業日・発送カレンダー",
};

/** 構成リストの行など、狭い場所で使う短いラベル */
export const BLOCK_SHORT: Record<BlockType, string> = {
  hero: "ヒーロー",
  heading: "見出し",
  richtext: "見出し＋リード",
  text: "テキスト",
  image: "画像",
  image2col: "画像2列",
  image3col: "画像3列",
  banner: "バナー",
  iconmenu: "アイコンメニュー",
  slideshow: "スライド",
  productgrid: "商品グリッド",
  ranking: "ランキング",
  coupon: "クーポン",
  countdown: "カウントダウン",
  button: "ボタン",
  sns: "SNS",
  spacer: "余白",
  divider: "区切り線",
  html: "HTML",
  featurelist: "特徴リスト",
  steps: "ステップ",
  faq: "よくある質問",
  reviews: "お客様の声",
  notice: "注意書き",
  infobar: "お知らせバー",
  gallery: "ギャラリー",
  video: "動画",
  media: "画像＋文",
  beforeafter: "Before/After",
  logos: "ロゴ帯",
  tabs: "タブ",
  accordion: "アコーディオン",
  spotlight: "注目商品",
  pricing: "料金プラン",
  compare: "比較表",
  stats: "実績数字",
  badges: "安心バッジ",
  rating: "評価★",
  talk: "吹き出し",
  timeline: "スケジュール",
  recommend: "おすすめ対象",
  calendar: "営業日カレンダー",
};

export const BLOCK_GROUP: { label: string; types: BlockType[] }[] = [
  { label: "基本", types: ["hero", "heading", "richtext", "text", "button", "spacer", "divider", "infobar"] },
  { label: "画像・動画", types: ["image", "image2col", "image3col", "banner", "slideshow", "gallery", "video", "media", "beforeafter"] },
  { label: "ナビ・回遊", types: ["iconmenu", "logos", "tabs", "accordion"] },
  { label: "商品・販促", types: ["productgrid", "ranking", "spotlight", "pricing", "compare", "coupon", "countdown"] },
  { label: "信頼・実績", types: ["stats", "badges", "rating", "reviews", "talk"] },
  { label: "説明・流れ", types: ["featurelist", "steps", "timeline", "recommend", "faq", "calendar", "notice"] },
  { label: "埋め込み・高度", types: ["sns", "html"] },
];

/** 空文字の色/半径プロパティは「テーマに従う」。生成時に var(--mu-*) へフォールバックする。 */
export const BLOCK_DEFAULT: Record<BlockType, Record<string, string>> = {
  hero: {
    src: "", alt: "", href: "", heading: "SEASON SALE", sub: "期間限定・最大50%OFF",
    btnLabel: "特集を見る", btnHref: "#", btnColor: "", btnHoverBg: "", btnHoverColor: "",
    overlay: "40", ovColor: "#000000", blur: "0",
    textColor: "#ffffff", align: "center", minH: "360", gradFrom: "", gradTo: "",
  },
  heading: { text: "セクション見出し", level: "h2", align: "center", color: "", accent: "", weight: "800" },
  richtext: { title: "おすすめ特集", lead: "スタッフが厳選したこの季節の一押しアイテムをご紹介します。", align: "center", titleColor: "", leadColor: "#555555" },
  text: { text: "ここに説明文を入力します。\n改行はそのまま反映されます。", align: "left", color: "#2b2b2b", size: "15" },
  image: { src: "", alt: "", href: "", width: "100", radius: "theme", shadow: "none", ovColor: "#000000", ov: "0", blur: "0" },
  image2col: { src1: "", alt1: "", href1: "", src2: "", alt2: "", href2: "", gap: "16", radius: "theme" },
  image3col: { src1: "", href1: "", src2: "", href2: "", src3: "", href3: "", gap: "12", radius: "theme" },
  banner: { src: "", alt: "", href: "", caption: "", radius: "theme", shadow: "none", capColor: "#777777", ovColor: "#000000", ov: "0", blur: "0" },
  iconmenu: {
    cols: "4", items: "新着||#\nランキング||#\nセール||#\nクーポン||#",
    bg: "", border: "", labelColor: "", hover: "", radius: "theme", iconSize: "42",
  },
  slideshow: { slides: "|#\n|#\n|#", interval: "4", radius: "theme", dot: "" },
  productgrid: {
    cols: "3", items: "商品名A||2,980円|#\n商品名B||3,480円|#\n商品名C||1,980円|#", auto: "",
    cardBg: "", border: "", nameColor: "", priceColor: "", radius: "theme",
  },
  ranking: {
    items: "1位商品||4,980円|#\n2位商品||3,980円|#\n3位商品||2,980円|#", auto: "",
    cardBg: "", border: "", nameColor: "", priceColor: "", radius: "theme", badge: "",
  },
  coupon: { title: "全商品で使える500円OFFクーポン", detail: "5,000円以上のご購入で / 期間中何度でも", code: "", href: "#", bg: "", color: "#ffffff", radius: "theme" },
  countdown: { title: "セール終了まで", deadline: "", bg: "#1a1a1a", color: "#ffffff", accent: "", radius: "theme" },
  button: { label: "商品一覧を見る", href: "#", bg: "", color: "#ffffff", hoverBg: "", hoverColor: "", align: "center", size: "md", radius: "theme", full: "", shadow: "1" },
  sns: { kind: "instagram", url: "", bg: "", color: "#ffffff" },
  spacer: { height: "40", bg: "" },
  divider: { color: "#e5e5e5", style: "solid", width: "100", thickness: "1" },
  html: { code: "<!-- 任意のHTML -->" },
  featurelist: {
    style: "number",
    items:
      "1本5役のオールインワン|化粧水・美容液・乳液・クリーム・パックがこれ1本に。忙しい朝でも手を抜きません。\n国内工場で一つずつ|品質管理された国内工場で製造し、全ロットで検査を実施しています。\nいつでも解約OK|定期便はお届け回数の縛りなし。合わなければすぐに止められます。",
  },
  steps: {
    items:
      "洗顔・タオルドライ|清潔な肌に。こすらず、押さえるように水分を取ります。\n適量を手に取る|さくらんぼ大を手のひらに広げます。\n顔全体になじませる|内側から外側へ、やさしく包み込むように。\n気になる部分は重ねづけ|乾燥しやすい目元・口元にもう一度。",
  },
  faq: {
    items:
      "定期便はいつでも解約できますか？|次回発送の10日前までにマイページまたはお電話でご連絡いただければ、回数に関わらず解約・停止できます。\n敏感肌でも使えますか？|パッチテスト済みですが、心配な方は腕の内側で試してからご使用ください。\n支払い方法は？|クレジットカード・代金引換・後払いがご利用いただけます。",
  },
  reviews: {
    cols: "2",
    items:
      "朝の支度が5分短くなりました。もうこれなしには戻れません。|M.K さん|30代・女性\nベタつかないのに、しっとりが夜まで続くのが気に入っています。|Y.T さん|40代・女性\n家族みんなで使えるので、結果的にコスパが良いです。|R.S さん|50代・男性",
    note: "※感想には個人差があり、効果を保証するものではありません。",
  },
  notice: { text: "※価格はすべて税込です。※定期便はお届け回数の縛りはありません。※商品画像はイメージです。実際の色味と異なる場合があります。" },
  infobar: { text: "本日20:00スタート／期間中は全商品ポイント5倍", href: "#", bg: "", color: "#ffffff", cta: "くわしく見る" },
  gallery: { items: "|#\n|#\n|#\n|#\n|#\n|#", cols: "3", gap: "8", radius: "theme" },
  video: { url: "", poster: "", ratio: "16/9", caption: "" },
  media: {
    src: "", href: "", heading: "素材へのこだわり",
    body: "選び抜いた国産素材だけを使用し、熟練の職人が一点ずつ仕上げています。使うほどに手になじむ経年変化もお楽しみください。",
    btnLabel: "くわしく見る", btnHref: "#", reverse: "", align: "left",
  },
  beforeafter: { before: "", after: "", labelBefore: "Before", labelAfter: "After", note: "※効果には個人差があります。使用イメージです。" },
  logos: { title: "取り扱いブランド", items: "|#\n|#\n|#\n|#\n|#", grayscale: "1" },
  tabs: {
    items:
      "商品詳細|素材・仕様・お手入れ方法などの詳しい情報をこちらに記載します。\nサイズ|S / M / L の実寸（cm）と、選び方の目安を掲載します。\nレビュー|ご購入者さまからの声を抜粋して掲載します。",
  },
  accordion: {
    open: "1",
    items:
      "配送について|ご注文から3〜5営業日以内に発送します。お届け日時のご指定も可能です。\nサイズ交換|初回1回無料。タグ付き・未使用品に限り、到着後7日以内にご連絡ください。\n素材・お手入れ|直射日光を避けて陰干しで保管してください。水濡れ時はすぐに乾いた布で拭き取りを。",
  },
  spotlight: {
    src: "", href: "#", tag: "数量限定", name: "名入れレザーウォレット",
    desc: "本ヌメ革の二つ折り財布。名入れ刻印は無料。使い込むほどに深まる艶をお楽しみください。",
    price: "9,800円", btnLabel: "商品ページを見る", reverse: "",
  },
  pricing: {
    items:
      "お試し|1,980円|1回のみ・送料無料;いつでも解約OK|購入する|\n定期便|1,780円|5%OFF・送料無料;いつでも解約OK;お届け周期の変更可|定期便を始める|1\nまとめ買い|9,800円|6本セット(13%OFF);送料無料|セットを購入|",
    note: "※価格は税込です。定期便はお届け回数の縛りはありません。",
  },
  compare: {
    head: "項目|当店|A社|B社",
    rows: "送料|無料|550円|440円\n名入れ刻印|無料|+1,100円|不可\n保証期間|1年|なし|6ヶ月\n返品・交換|30日以内OK|未開封のみ|7日以内",
    highlight: "1",
  },
  stats: { items: "累計販売|128,000個\nレビュー件数|8,400件\nリピート率|92%", cols: "3", color: "" },
  badges: { items: "送料無料|3,980円以上のご購入で\nあす楽対応|14時までのご注文\n30日返品OK|未使用・タグ付きに限る\n国内発送|自社倉庫より当日出荷" },
  rating: { score: "4.6", count: "842", dist: "72|19|5|2|2", note: "※自社ストアのレビュー集計値です。" },
  talk: {
    items:
      "l|毎朝のスキンケア、時間がかかって大変で…\nr|それ、1本にまとめると解決しますよ。\nl|オールインワンってベタつきませんか？\nr|使用感はさらっと。それでいて夜まで保湿が続きます。",
  },
  timeline: {
    items:
      "6/1（土）|予約受付スタート|数量限定・なくなり次第終了\n6/15（土）|順次出荷開始|ご予約順に発送いたします\n6/20（木）|一般販売開始|在庫がある場合のみ販売",
  },
  recommend: {
    title: "こんな方におすすめ",
    items: "スキンケアを時短で済ませたい\n乾燥は気になるがベタつきは苦手\n家族みんなで1本を共有したい\n肌に余計なものは使いたくない",
  },
  calendar: { month: "", closed: "0,6", holidays: "", note: "＝定休日（発送業務はお休み）。翌営業日以降の発送となります。" },
};

// ── テーマ ─────────────────────────────────
export type FontKey = "gothic" | "mincho" | "rounded";
export type RadiusKey = "sharp" | "soft" | "round";
export type HeadingStyle = "bar" | "underline" | "plain";

export const FONTS: { key: FontKey; label: string; stack: string; sample: string }[] = [
  { key: "gothic", label: "ゴシック", stack: '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",YuGothic,Meiryo,sans-serif', sample: "しっかり読みやすい定番" },
  { key: "mincho", label: "明朝", stack: '"Hiragino Mincho ProN","Yu Mincho",YuMincho,"Noto Serif JP","MS PMincho",serif', sample: "上品で落ち着いた印象" },
  { key: "rounded", label: "丸ゴシック", stack: '"Hiragino Maru Gothic ProN","M PLUS Rounded 1c","Rounded Mplus 1c","Yu Gothic",sans-serif', sample: "やわらかく親しみやすい" },
];

export const THEME_COLORS: { name: string; primary: string; accent: string }[] = [
  { name: "レッド", primary: "#c8102e", accent: "#e0233d" },
  { name: "ワイン", primary: "#8e1a2e", accent: "#b03047" },
  { name: "ネイビー", primary: "#1f3a5f", accent: "#2f5c94" },
  { name: "ブルー", primary: "#1560bd", accent: "#2f80ed" },
  { name: "フォレスト", primary: "#1f6f4a", accent: "#2e9163" },
  { name: "テラコッタ", primary: "#b25a3a", accent: "#cf7b56" },
  { name: "ブラック×金", primary: "#141414", accent: "#c9a227" },
  { name: "ピンク", primary: "#c2185b", accent: "#e35c8a" },
];

export interface Theme {
  font: FontKey;
  primary: string;
  accent: string;
  radius: RadiusKey;
  heading: HeadingStyle;
  /** ページ全体の背景色（空 = 白） */
  bg?: string;
}

export const DEFAULT_THEME: Theme = { font: "gothic", primary: "#c8102e", accent: "#e0233d", radius: "soft", heading: "bar", bg: "#ffffff" };
const RADIUS_PX: Record<RadiusKey, string> = { sharp: "0px", soft: "10px", round: "18px" };

// ── HTML 生成 ──────────────────────────────
const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 実際の改行、および入力欄で打った \n（バックスラッシュ+n）を <br> にする */
const brNl = (s: string) => (s || "").replace(/\\n|\r?\n/g, "<br>");

function resolveSrc(src: string, baseUrl: string): string {
  const s = (src || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("//") || s.startsWith("data:")) return s;
  const b = baseUrl.replace(/\/$/, "");
  return b ? `${b}/${s.replace(/^\//, "")}` : s;
}

const IMG_PH = `<span class="mu-img-ph"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5L5 21"/></svg><span>IMAGE</span></span>`;

function img(src: string, alt: string, href: string, baseUrl: string, cls = "mu-img"): string {
  const resolved = resolveSrc(src, baseUrl);
  const isReal = /^(https?:|data:|\/\/)/i.test(resolved);
  const inner = isReal ? `<img class="${cls}" src="${esc(resolved)}" alt="${esc(alt)}" loading="lazy">` : IMG_PH;
  return href.trim() && href.trim() !== "#" ? `<a href="${esc(href)}">${inner}</a>` : inner;
}

const lines = (s: string) => (s || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const visClass = (v?: Visibility) => (v === "pc" ? " mu-pc-only" : v === "sp" ? " mu-sp-only" : "");

function hexA(hex: string, pct: number): string {
  const m = (hex || "#000000").replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) || 0;
  const g = parseInt(m.slice(2, 4), 16) || 0;
  const b = parseInt(m.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(100, pct)) / 100})`;
}

/** オーバーレイ色 / 曇りガラス（blur）を重ねられる画像。hero・image・banner で使用。 */
function figureFx(
  src: string,
  alt: string,
  href: string,
  baseUrl: string,
  fx: { ovColor?: string; ov?: string; blur?: string; radius?: string; shadow?: string },
): string {
  const base = img(src, alt, "", baseUrl);
  const ov = Number(fx.ov) || 0;
  const blur = Number(fx.blur) || 0;
  const rad = radiusPx(fx.radius || "");
  const shadow = shadowCss(fx.shadow || "");
  const hasOverlay = ov > 0 || blur > 0;
  if (!hasOverlay && !rad && !shadow) {
    return href.trim() && href.trim() !== "#" ? `<a href="${esc(href)}">${base}</a>` : base;
  }
  const ovl = hasOverlay
    ? `<span class="mu-ovl" style="${sx(
        ["background", ov > 0 && hexA(fx.ovColor || "#000000", ov)],
        ["backdrop-filter", blur > 0 && `blur(${blur}px)`],
        ["-webkit-backdrop-filter", blur > 0 && `blur(${blur}px)`],
      )}"></span>`
    : "";
  const wrap = `<span class="mu-figfx" style="${sx(["border-radius", rad], ["box-shadow", shadow])}">${base}${ovl}</span>`;
  return href.trim() && href.trim() !== "#" ? `<a href="${esc(href)}">${wrap}</a>` : wrap;
}
const radiusPx = (v: string) => (v === "theme" || v == null ? "" : v === "round" ? "999px" : `${v}px`);
const shadowCss = (v: string) =>
  v === "soft" ? "0 8px 24px rgba(0,0,0,.1)" : v === "strong" ? "0 14px 40px rgba(0,0,0,.18)" : "";
/** style宣言を「key:value;」で連結（空はスキップ） */
const sx = (...pairs: [string, string | false | undefined][]) =>
  pairs.filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(";");

/** 営業日・発送カレンダー（生成時点の月、または month="YYYY-MM" 指定の月を静的に描画） */
function calendarHtml(p: Record<string, string>, vc: string): string {
  const now = new Date();
  const m = /^\d{4}-\d{2}$/.test(p.month || "") ? p.month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, mo] = m.split("-").map(Number);
  const closedW = new Set((p.closed || "").split(",").map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n)));
  const holidays = new Set((p.holidays || "").split(",").map((x) => Number(x.trim())).filter((n) => n > 0));
  const first = new Date(y, mo - 1, 1);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const wk = ["日", "月", "火", "水", "木", "金", "土"];
  const head = wk.map((d, i) => `<th class="${i === 0 ? "mu-cal-sun" : i === 6 ? "mu-cal-sat" : ""}">${d}</th>`).join("");
  let cells = "";
  for (let i = 0; i < first.getDay(); i++) cells += "<td></td>";
  for (let d = 1; d <= daysInMonth; d++) {
    const w = new Date(y, mo - 1, d).getDay();
    const off = closedW.has(w) || holidays.has(d);
    const wc = w === 0 ? " mu-cal-sun" : w === 6 ? " mu-cal-sat" : "";
    cells += `<td class="${off ? "mu-cal-off" : ""}${wc}">${d}</td>`;
    if ((first.getDay() + d) % 7 === 0 && d !== daysInMonth) cells += "</tr><tr>";
  }
  return `<div class="mu-cal${vc}">
  <p class="mu-cal-h">${y}年${mo}月　発送カレンダー</p>
  <table class="mu-cal-t"><thead><tr>${head}</tr></thead><tbody><tr>${cells}</tr></tbody></table>
  ${p.note.trim() ? `<p class="mu-cal-note"><span class="mu-cal-key"></span>${esc(p.note)}</p>` : ""}
</div>`;
}

export function blockHtml(b: Block, baseUrl: string): string {
  const p = b.props;
  const vc = visClass(b.vis);
  switch (b.type) {
    case "hero": {
      const src = resolveSrc(p.src, baseUrl);
      const blur = Number(p.blur) || 0;
      const ov = Number(p.overlay) || 0;
      const bgLayer = src
        ? `<span class="mu-hero-bg" style="background-image:url('${esc(src)}')${blur ? `;filter:blur(${blur}px)` : ""}"></span>`
        : `<span class="mu-hero-bg" style="background:linear-gradient(135deg,${esc(p.gradFrom || "var(--mu-accent)")},${esc(p.gradTo || "var(--mu-primary)")})"></span>`;
      const shade = ov > 0 ? `<span class="mu-hero-shade" style="background:${hexA(p.ovColor || "#000000", ov)}"></span>` : "";
      const heroBtnSt = sx(
        ["border-color", p.btnColor],
        ["color", p.btnColor],
        ["--mu-hbtn-hbg", p.btnHoverBg],
        ["--mu-hbtn-hcolor", p.btnHoverColor],
      );
      const btn = p.btnLabel.trim()
        ? `<a class="mu-hero-btn" href="${esc(p.btnHref)}"${heroBtnSt ? ` style="${heroBtnSt}"` : ""}>${esc(p.btnLabel)}</a>`
        : "";
      return `<section class="mu-hero${vc}" style="--mu-hero-h:${esc(p.minH || "360")}px;text-align:${esc(p.align || "center")}">
  ${bgLayer}${shade}
  <div class="mu-hero-inner" style="color:${esc(p.textColor)}">
    <h2 class="mu-hero-h">${brNl(esc(p.heading))}</h2>
    ${p.sub.trim() ? `<p class="mu-hero-sub">${brNl(esc(p.sub))}</p>` : ""}
    ${btn}
  </div>
</section>`;
    }
    case "heading": {
      const lv = /^h[2-4]$/.test(p.level) ? p.level : "h2";
      const st = sx(["text-align", p.align], ["color", p.color], ["--mu-accent", p.accent], ["font-weight", p.weight && p.weight !== "800" && p.weight]);
      return `<${lv} class="mu-h${vc}" style="${st}"><span>${esc(p.text)}</span></${lv}>`;
    }
    case "richtext":
      return `<div class="mu-rich${vc}" style="text-align:${esc(p.align)}">
  <h2 class="mu-rich-t"${p.titleColor ? ` style="color:${esc(p.titleColor)}"` : ""}>${esc(p.title)}</h2>
  <p class="mu-rich-l"${p.leadColor ? ` style="color:${esc(p.leadColor)}"` : ""}>${esc(p.lead).replace(/\n/g, "<br>")}</p>
</div>`;
    case "text":
      return `<p class="mu-text${vc}" style="${sx(["text-align", p.align], ["color", p.color], ["font-size", p.size && `${p.size}px`])}">${esc(p.text).replace(/\n/g, "<br>")}</p>`;
    case "image": {
      return `<div class="mu-block mu-imgwrap${vc}" style="max-width:${esc(p.width)}%;margin:20px auto">${figureFx(
        p.src, p.alt, p.href, baseUrl,
        { ovColor: p.ovColor, ov: p.ov, blur: p.blur, radius: p.radius, shadow: p.shadow },
      )}</div>`;
    }
    case "image2col":
      return `<div class="mu-grid mu-grid-2${vc}" style="gap:${esc(p.gap || "16")}px;--mu-grid-r:${radiusPx(p.radius) || "var(--mu-radius)"}">
  <div>${img(p.src1, p.alt1, p.href1, baseUrl)}</div>
  <div>${img(p.src2, p.alt2, p.href2, baseUrl)}</div>
</div>`;
    case "image3col":
      return `<div class="mu-grid mu-grid-3${vc}" style="gap:${esc(p.gap || "12")}px;--mu-grid-r:${radiusPx(p.radius) || "var(--mu-radius)"}">
  <div>${img(p.src1, "", p.href1, baseUrl)}</div>
  <div>${img(p.src2, "", p.href2, baseUrl)}</div>
  <div>${img(p.src3, "", p.href3, baseUrl)}</div>
</div>`;
    case "banner": {
      return `<div class="mu-banner${vc}">${figureFx(
        p.src, p.alt, p.href, baseUrl,
        { ovColor: p.ovColor, ov: p.ov, blur: p.blur, radius: p.radius, shadow: p.shadow },
      )}${
        p.caption.trim() ? `<div class="mu-banner-cap" style="color:${esc(p.capColor || "#777")}">${esc(p.caption)}</div>` : ""
      }</div>`;
    }
    case "iconmenu": {
      const vars = sx(
        ["--mu-ico-cols", p.cols || "4"],
        ["--mu-ico-bg", p.bg], ["--mu-ico-border", p.border], ["--mu-ico-color", p.labelColor],
        ["--mu-ico-hover", p.hover], ["--mu-ico-r", radiusPx(p.radius) || "var(--mu-radius)"], ["--mu-ico-size", `${p.iconSize || "42"}px`],
      );
      const rows = lines(p.items);
      const cells = rows.map((l) => {
        const [label, src, href] = l.split("|").map((x) => (x || "").trim());
        return `<a class="mu-ico" href="${esc(href || "#")}">${img(src, label, "", baseUrl, "mu-ico-img")}<span>${esc(label)}</span></a>`;
      }).join("\n    ");
      // 5個以上は横スクロールの帯にして詰め込み・文字切れを防ぐ
      const scrollCls = rows.length >= 5 ? " mu-ico-scroll" : "";
      return `<nav class="mu-iconmenu${scrollCls}${vc}" style="${vars}">\n    ${cells}\n</nav>`;
    }
    case "slideshow": {
      const sl = lines(p.slides);
      const slides = sl.map((l, i) => {
        const [src, href] = l.split("|").map((x) => (x || "").trim());
        return `<div class="mu-slide"${i === 0 ? ' data-active="1"' : ""}>${img(src, "", href, baseUrl)}</div>`;
      }).join("\n    ");
      const dots = sl.map((_, i) => `<button data-dot="${i}"${i === 0 ? ' data-active="1"' : ""}></button>`).join("");
      const st = sx(["border-radius", radiusPx(p.radius)], ["--mu-dot", p.dot]);
      return `<div class="mu-slideshow${vc}" data-interval="${(Number(p.interval) || 4) * 1000}" style="${st}">\n    ${slides}\n    <div class="mu-dots">${dots}</div>\n</div>`;
    }
    case "productgrid":
    case "ranking": {
      const isRank = b.type === "ranking";
      if (p.auto === "1") {
        return `<div class="mu-auto${vc}" data-mu-auto="${isRank ? "ranking" : "new-arrivals"}" data-cols="${esc(p.cols || "3")}">自動更新エリア（${isRank ? "ランキング" : "新着商品"}）：拡張連携で毎日更新されます</div>`;
      }
      const vars = sx(
        ["--mu-cols", isRank ? "3" : p.cols || "3"],
        ["--mu-card-bg", p.cardBg], ["--mu-card-border", p.border],
        ["--mu-name-color", p.nameColor], ["--mu-price-color", p.priceColor],
        ["--mu-card-r", radiusPx(p.radius) || "var(--mu-radius)"], ["--mu-badge", isRank && p.badge],
      );
      const cards = lines(p.items).map((l, i) => {
        const [name, src, price, href] = l.split("|").map((x) => (x || "").trim());
        return `<a class="mu-card${isRank && p.badge ? " mu-badge-custom" : ""}" href="${esc(href || "#")}">
      ${isRank ? `<span class="mu-rank-badge">${i + 1}</span>` : ""}
      ${img(src, name, "", baseUrl)}
      <span class="mu-card-name">${esc(name)}</span>
      ${price ? `<span class="mu-card-price">${esc(price)}</span>` : ""}
    </a>`;
      }).join("\n    ");
      return `<div class="mu-cards${vc}" style="${vars}">\n    ${cards}\n</div>`;
    }
    case "coupon":
      return `<a class="mu-coupon${vc}" href="${esc(p.href)}" style="${sx(["background", p.bg], ["color", p.color], ["border-radius", radiusPx(p.radius)])}">
  <span class="mu-coupon-t">${brNl(esc(p.title))}</span>
  <span class="mu-coupon-d">${brNl(esc(p.detail))}</span>
  ${p.code.trim() ? `<span class="mu-coupon-code">クーポンコード: ${esc(p.code)}</span>` : ""}
</a>`;
    case "countdown":
      return `<div class="mu-countdown${vc}" data-deadline="${esc(p.deadline)}" style="${sx(["background", p.bg], ["color", p.color], ["border-radius", radiusPx(p.radius)], ["--mu-cd-accent", p.accent])}">
  <span class="mu-cd-t">${esc(p.title)}</span>
  <span class="mu-cd-nums"><b data-d>--</b>日 <b data-h>--</b>:<b data-m>--</b>:<b data-s>--</b></span>
</div>`;
    case "button": {
      const sz = p.size === "lg" ? "mu-btn-lg" : p.size === "sm" ? "mu-btn-sm" : "";
      const st = sx(
        ["--mu-btn-bg", p.bg],
        ["--mu-btn-color", p.color],
        ["--mu-btn-hbg", p.hoverBg],
        ["--mu-btn-hcolor", p.hoverColor],
        ["border-radius", radiusPx(p.radius)],
        ["box-shadow", p.shadow === "1" ? "" : "none"],
        ["width", p.full === "1" && "calc(100% - 32px)"],
      );
      return `<div class="mu-block${vc}" style="text-align:${esc(p.align)}"><a class="mu-btn ${sz}" href="${esc(p.href)}" style="${st}">${esc(p.label)}</a></div>`;
    }
    case "sns": {
      const u = esc(p.url);
      if (!p.url.trim()) return `<div class="mu-block${vc}"><span class="mu-img-ph">SNSのURL未設定</span></div>`;
      if (p.kind === "youtube") {
        const id = (p.url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1] || "";
        return id
          ? `<div class="mu-embed${vc}"><iframe src="https://www.youtube.com/embed/${id}" allowfullscreen loading="lazy"></iframe></div>`
          : `<div class="mu-block${vc}"><a href="${u}">${u}</a></div>`;
      }
      return `<div class="mu-block${vc}" style="text-align:center"><a class="mu-btn mu-btn-sm" href="${u}" target="_blank" rel="noopener" style="${sx(["background", p.bg], ["color", p.color])}">${p.kind === "instagram" ? "Instagramを見る" : "SNSを見る"}</a></div>`;
    }
    case "featurelist": {
      const li = lines(p.items).map((l, i) => {
        const [h, d] = l.split("|").map((x) => (x || "").trim());
        const n = p.style === "check" ? "✓" : String(i + 1).padStart(2, "0");
        return `<li><span class="mu-feat-n">${n}</span><div><b>${esc(h)}</b>${d ? `<p>${esc(d)}</p>` : ""}</div></li>`;
      }).join("\n    ");
      return `<ul class="mu-features${vc}">\n    ${li}\n</ul>`;
    }
    case "steps": {
      const li = lines(p.items).map((l, i) => {
        const [h, d] = l.split("|").map((x) => (x || "").trim());
        return `<li><span class="mu-step-n">${i + 1}</span><div><b>${esc(h)}</b>${d ? `<p>${esc(d)}</p>` : ""}</div></li>`;
      }).join("\n    ");
      return `<ol class="mu-steps${vc}">\n    ${li}\n</ol>`;
    }
    case "faq": {
      const it = lines(p.items).map((l) => {
        const [q, a] = l.split("|").map((x) => (x || "").trim());
        return `<div class="mu-faq-item"><p class="mu-faq-q"><span>Q</span>${esc(q)}</p>${a ? `<p class="mu-faq-a">${esc(a)}</p>` : ""}</div>`;
      }).join("\n    ");
      return `<div class="mu-faq${vc}">\n    ${it}\n</div>`;
    }
    case "reviews": {
      const it = lines(p.items).map((l) => {
        const [body, name, attr] = l.split("|").map((x) => (x || "").trim());
        return `<figure class="mu-review"><blockquote>${esc(body)}</blockquote><figcaption>${esc(name)}${attr ? `<span>${esc(attr)}</span>` : ""}</figcaption></figure>`;
      }).join("\n    ");
      return `<div class="mu-reviews${vc}" style="--mu-rv-cols:${esc(p.cols || "2")}">\n    ${it}\n</div>${
        p.note.trim() ? `\n<p class="mu-review-note">${esc(p.note)}</p>` : ""
      }`;
    }
    case "notice":
      return `<p class="mu-notice${vc}">${esc(p.text).replace(/\n/g, "<br>")}</p>`;
    case "infobar": {
      const st = sx(["background", p.bg], ["color", p.color]);
      const cta = p.cta.trim() ? `<span class="mu-infobar-cta">${esc(p.cta)}</span>` : "";
      return `<a class="mu-infobar${vc}" href="${esc(p.href || "#")}"${st ? ` style="${st}"` : ""}>${brNl(esc(p.text))}${cta}</a>`;
    }
    case "gallery": {
      const items = lines(p.items).map((l) => {
        const [src, href] = l.split("|").map((x) => (x || "").trim());
        return `<div class="mu-gitem">${img(src, "", href, baseUrl)}</div>`;
      }).join("\n    ");
      const st = sx(["--mu-gl-cols", p.cols || "3"], ["--mu-gl-gap", `${p.gap || "8"}px`], ["--mu-gl-r", radiusPx(p.radius) || "var(--mu-radius)"]);
      return `<div class="mu-gallery${vc}" style="${st}">\n    ${items}\n</div>`;
    }
    case "video": {
      const cap = p.caption.trim() ? `<div class="mu-banner-cap">${esc(p.caption)}</div>` : "";
      const ratio = /^\d+\/\d+$/.test(p.ratio) ? p.ratio : "16/9";
      const u = (p.url || "").trim();
      const yt = (u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || [])[1];
      let media: string;
      if (yt) {
        media = `<iframe src="https://www.youtube.com/embed/${yt}" allowfullscreen loading="lazy"></iframe>`;
      } else if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) {
        const poster = resolveSrc(p.poster, baseUrl);
        media = `<video controls preload="metadata"${poster ? ` poster="${esc(poster)}"` : ""} src="${esc(resolveSrc(u, baseUrl))}"></video>`;
      } else {
        media = IMG_PH;
      }
      return `<div class="mu-video${vc}"><div class="mu-video-fr" style="aspect-ratio:${ratio}">${media}</div>${cap}</div>`;
    }
    case "media": {
      const btn = p.btnLabel.trim() ? `<a class="mu-btn mu-btn-sm" href="${esc(p.btnHref || "#")}">${esc(p.btnLabel)}</a>` : "";
      return `<div class="mu-media${p.reverse === "1" ? " mu-media-rev" : ""}${vc}">
    <div class="mu-media-img">${img(p.src, p.heading, p.href, baseUrl)}</div>
    <div class="mu-media-body" style="text-align:${esc(p.align || "left")}">
      <h3 class="mu-media-h">${brNl(esc(p.heading))}</h3>
      <p class="mu-media-p">${esc(p.body).replace(/\n/g, "<br>")}</p>
      ${btn}
    </div>
</div>`;
    }
    case "beforeafter": {
      const cell = (src: string, label: string) =>
        `<figure class="mu-ba-cell"><span class="mu-ba-tag">${esc(label)}</span>${img(src, label, "", baseUrl)}</figure>`;
      return `<div class="mu-ba${vc}">
    ${cell(p.before, p.labelBefore || "Before")}
    ${cell(p.after, p.labelAfter || "After")}
  </div>${p.note.trim() ? `\n<p class="mu-review-note">${esc(p.note)}</p>` : ""}`;
    }
    case "logos": {
      const items = lines(p.items).map((l) => {
        const [src, href] = l.split("|").map((x) => (x || "").trim());
        return `<span class="mu-logo">${img(src, "", href, baseUrl)}</span>`;
      }).join("\n    ");
      return `<div class="mu-logos${p.grayscale === "1" ? " mu-logos-g" : ""}${vc}">
    ${p.title.trim() ? `<p class="mu-logos-t">${esc(p.title)}</p>` : ""}
    <div class="mu-logos-row">\n    ${items}\n    </div>
</div>`;
    }
    case "tabs": {
      const its = lines(p.items).map((l) => {
        const idx = l.indexOf("|");
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      });
      const nav = its.map(([t], i) => `<button class="mu-tab${i === 0 ? " is-active" : ""}" data-tab="${i}">${esc(t)}</button>`).join("");
      const panes = its.map(([, body], i) => `<div class="mu-tab-pane${i === 0 ? " is-active" : ""}" data-pane="${i}">${esc(body).replace(/\n/g, "<br>")}</div>`).join("\n    ");
      return `<div class="mu-tabs${vc}">\n  <div class="mu-tab-nav">${nav}</div>\n  <div class="mu-tab-body">\n    ${panes}\n  </div>\n</div>`;
    }
    case "accordion": {
      const its = lines(p.items).map((l, i) => {
        const idx = l.indexOf("|");
        const q = l.slice(0, idx).trim();
        const a = l.slice(idx + 1).trim();
        const open = i === 0 && p.open === "1" ? " open" : "";
        return `<details class="mu-acc-item"${open}><summary>${esc(q)}<span class="mu-acc-mk"></span></summary><div class="mu-acc-body">${esc(a).replace(/\n/g, "<br>")}</div></details>`;
      }).join("\n    ");
      return `<div class="mu-acc${vc}">\n    ${its}\n</div>`;
    }
    case "spotlight": {
      return `<div class="mu-spot${p.reverse === "1" ? " mu-spot-rev" : ""}${vc}">
    <div class="mu-spot-img">${img(p.src, p.name, p.href, baseUrl)}</div>
    <div class="mu-spot-body">
      ${p.tag.trim() ? `<span class="mu-spot-tag">${esc(p.tag)}</span>` : ""}
      <h3 class="mu-spot-name">${brNl(esc(p.name))}</h3>
      ${p.desc.trim() ? `<p class="mu-spot-desc">${esc(p.desc).replace(/\n/g, "<br>")}</p>` : ""}
      ${p.price.trim() ? `<span class="mu-spot-price">${esc(p.price)}</span>` : ""}
      ${p.btnLabel.trim() ? `<a class="mu-btn" href="${esc(p.href || "#")}">${esc(p.btnLabel)}</a>` : ""}
    </div>
</div>`;
    }
    case "pricing": {
      const cards = lines(p.items).map((l) => {
        const [name, price, feats, btn, rec] = l.split("|").map((x) => (x || "").trim());
        const fl = (feats || "").split(";").map((x) => x.trim()).filter(Boolean)
          .map((f) => `<li>${esc(f)}</li>`).join("");
        return `<div class="mu-plan${rec === "1" ? " mu-plan-rec" : ""}">
      ${rec === "1" ? `<span class="mu-plan-badge">おすすめ</span>` : ""}
      <span class="mu-plan-name">${esc(name)}</span>
      <span class="mu-plan-price">${esc(price)}</span>
      <ul class="mu-plan-feats">${fl}</ul>
      ${btn ? `<a class="mu-btn mu-btn-sm" href="#">${esc(btn)}</a>` : ""}
    </div>`;
      }).join("\n    ");
      return `<div class="mu-pricing${vc}">\n    ${cards}\n</div>${p.note.trim() ? `\n<p class="mu-review-note">${esc(p.note)}</p>` : ""}`;
    }
    case "compare": {
      const head = (p.head || "").split("|").map((x) => x.trim());
      const th = head.map((h, i) => `<th${i === 1 && p.highlight === "1" ? ' class="mu-cmp-hl"' : ""}>${esc(h)}</th>`).join("");
      const body = lines(p.rows).map((r) => {
        const cells = r.split("|").map((x) => x.trim());
        const tds = cells.map((c, i) => {
          if (i === 0) return `<th scope="row">${esc(c)}</th>`;
          const mark = c === "○" || c === "◯" ? '<span class="mu-cmp-o">○</span>' : c === "×" || c === "✕" ? '<span class="mu-cmp-x">×</span>' : esc(c);
          return `<td${i === 1 && p.highlight === "1" ? ' class="mu-cmp-hl"' : ""}>${mark}</td>`;
        }).join("");
        return `<tr>${tds}</tr>`;
      }).join("\n      ");
      return `<div class="mu-compare-wrap${vc}"><table class="mu-compare">
    <thead><tr>${th}</tr></thead>
    <tbody>\n      ${body}\n    </tbody>
  </table></div>`;
    }
    case "stats": {
      const items = lines(p.items).map((l) => {
        const [label, value] = l.split("|").map((x) => (x || "").trim());
        return `<div class="mu-stat"><b>${esc(value)}</b><span>${esc(label)}</span></div>`;
      }).join("\n    ");
      return `<div class="mu-stats${vc}" style="${sx(["--mu-st-cols", p.cols || "3"], ["--mu-st-color", p.color])}">\n    ${items}\n</div>`;
    }
    case "badges": {
      const items = lines(p.items).map((l) => {
        const [title, sub] = l.split("|").map((x) => (x || "").trim());
        return `<span class="mu-trust"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>`;
      }).join("\n    ");
      return `<div class="mu-trusts${vc}">\n    ${items}\n</div>`;
    }
    case "rating": {
      const score = Math.max(0, Math.min(5, Number(p.score) || 0));
      const pctStar = (score / 5) * 100;
      const dist = (p.dist || "").split("|").map((x) => Number(x.trim()) || 0);
      const bars = [5, 4, 3, 2, 1].map((n, i) =>
        `<div class="mu-rt-row"><span>${n}</span><div class="mu-rt-track"><div class="mu-rt-fill" style="width:${Math.max(0, Math.min(100, dist[i] || 0))}%"></div></div><span class="mu-rt-pct">${dist[i] || 0}%</span></div>`,
      ).join("");
      return `<div class="mu-rating${vc}">
    <div class="mu-rt-head">
      <b class="mu-rt-score">${score.toFixed(1)}</b>
      <span class="mu-rt-stars"><span class="mu-rt-stars-on" style="width:${pctStar}%"></span></span>
      <span class="mu-rt-count">${esc(p.count || "0")}件のレビュー</span>
    </div>
    <div class="mu-rt-dist">${bars}</div>
    ${p.note.trim() ? `<p class="mu-review-note" style="text-align:left;margin-left:0">${esc(p.note)}</p>` : ""}
</div>`;
    }
    case "talk": {
      const rows = lines(p.items).map((l) => {
        const idx = l.indexOf("|");
        const side = l.slice(0, idx).trim() === "r" ? "r" : "l";
        const text = l.slice(idx + 1).trim();
        return `<div class="mu-talk-row mu-talk-${side}"><span class="mu-talk-av"></span><p class="mu-bubble">${esc(text).replace(/\n/g, "<br>")}</p></div>`;
      }).join("\n    ");
      return `<div class="mu-talk${vc}">\n    ${rows}\n</div>`;
    }
    case "timeline": {
      const its = lines(p.items).map((l) => {
        const [date, title, desc] = l.split("|").map((x) => (x || "").trim());
        return `<li><span class="mu-tl-date">${esc(date)}</span><div class="mu-tl-c"><b>${esc(title)}</b>${desc ? `<p>${esc(desc)}</p>` : ""}</div></li>`;
      }).join("\n    ");
      return `<ol class="mu-timeline${vc}">\n    ${its}\n</ol>`;
    }
    case "recommend": {
      const its = lines(p.items).map((l) => `<li>${esc(l)}</li>`).join("\n    ");
      return `<div class="mu-rec${vc}">
    ${p.title.trim() ? `<p class="mu-rec-t">${esc(p.title)}</p>` : ""}
    <ul class="mu-rec-list">\n    ${its}\n    </ul>
</div>`;
    }
    case "calendar":
      return calendarHtml(p, vc);
    case "spacer":
      return `<div class="${vc.trim()}" style="height:${esc(p.height)}px${p.bg ? `;background:${esc(p.bg)}` : ""}"></div>`;
    case "divider":
      return `<hr class="mu-hr${vc}" style="border-top-color:${esc(p.color)};border-top-style:${esc(p.style || "solid")};border-top-width:${esc(p.thickness || "1")}px;width:${esc(p.width || "100")}%;margin-left:auto;margin-right:auto">`;
    case "html":
      return p.code || "";
  }
}

// ── CSS 生成（テーマ適用） ────────────────────
export function buildCss(theme: Theme): string {
  const font = FONTS.find((f) => f.key === theme.font)?.stack || FONTS[0].stack;
  const rad = RADIUS_PX[theme.radius];
  const headAfter =
    theme.heading === "plain"
      ? ".mu-h>span::after{display:none}"
      : theme.heading === "underline"
        ? '.mu-h>span::after{content:"";position:absolute;left:50%;bottom:0;width:44px;height:3px;background:var(--mu-accent);transform:translateX(-50%);border-radius:2px}.mu-h[style*="left"]>span::after{left:0;transform:none}'
        : '.mu-h>span{padding-left:14px}.mu-h>span::before{content:"";position:absolute;left:0;top:8%;bottom:8%;width:5px;background:var(--mu-primary);border-radius:3px}.mu-h[style*="center"]>span,.mu-h[style*="right"]>span{padding-left:0}.mu-h[style*="center"]>span::before,.mu-h[style*="right"]>span::before{display:none}.mu-h[style*="center"]>span::after{content:"";position:absolute;left:50%;bottom:-8px;width:40px;height:3px;background:var(--mu-accent);transform:translateX(-50%);border-radius:2px}';

  const bg = (theme.bg || "#ffffff").trim() || "#ffffff";
  // 背景が暗いときは本文テキストを明るく寄せる（簡易コントラスト調整）
  const bm = bg.replace("#", "");
  const lum =
    bm.length >= 6
      ? (0.299 * parseInt(bm.slice(0, 2), 16) +
          0.587 * parseInt(bm.slice(2, 4), 16) +
          0.114 * parseInt(bm.slice(4, 6), 16)) /
        255
      : 1;
  const darkBg = lum < 0.4;
  const darkCss = darkBg
    ? `
.mu-wrap{color:#ebebeb}
.mu-rich-l,.mu-text,.mu-features p,.mu-steps p,.mu-faq-a,.mu-tl-c p,.mu-media-p,.mu-spot-desc,.mu-plan-feats,.mu-review blockquote,.mu-bubble,.mu-rec-list li{color:#c8c8c8}
.mu-card,.mu-review,.mu-plan,.mu-trust,.mu-rec,.mu-cal,.mu-rating,.mu-acc-body,.mu-tab-body{color:#dcdcdc}
.mu-features li,.mu-faq-item,.mu-acc-item,.mu-rec-list li,.mu-plan-feats li{border-color:rgba(255,255,255,.14)}`
    : "";
  return `/* MUSOU-EC page builder — themed */
:root{--mu-primary:${theme.primary};--mu-accent:${theme.accent};--mu-radius:${rad};--mu-font:${font};--mu-bg:${bg}}
html,body{background:var(--mu-bg,#fff)}
.mu-wrap{max-width:960px;margin:0 auto;padding:0 0 44px;background:var(--mu-bg,#fff);font-family:var(--mu-font);color:#2b2b2b;line-height:1.8;-webkit-font-smoothing:antialiased;word-break:normal;overflow-wrap:break-word;line-break:strict}
.mu-wrap :where(h1,h2,h3,h4,p,span,a,li,dt,dd){min-width:0}
.mu-wrap *{box-sizing:border-box}
.mu-wrap img{max-width:100%}
.mu-block{margin:22px 16px}
.mu-img{display:block;width:100%;height:auto;border:0;border-radius:var(--mu-radius)}
.mu-imgwrap img{border-radius:inherit}
.mu-img-ph{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:100%;min-height:140px;background:#eef0f2;color:#a2a9b2;border-radius:var(--mu-radius);font-size:10px;letter-spacing:.16em;font-weight:700}
.mu-img-ph svg{opacity:.85}
.mu-card .mu-img-ph{aspect-ratio:1/1;min-height:0}
.mu-slide .mu-img-ph{aspect-ratio:16/7;min-height:0}
.mu-grid .mu-img-ph,.mu-banner .mu-img-ph{aspect-ratio:16/9;min-height:0}
.mu-ico .mu-img-ph{width:var(--mu-ico-size,42px);height:var(--mu-ico-size,42px);min-height:0;border-radius:8px}
.mu-ico .mu-img-ph svg{width:20px;height:20px}
.mu-ico .mu-img-ph span{display:none}
a{color:inherit}

.mu-hero{position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:var(--mu-hero-h,360px)}
.mu-hero-bg{position:absolute;inset:0;background-size:cover;background-position:center;transform:scale(1.04)}
.mu-hero-shade{position:absolute;inset:0}
.mu-hero-inner{position:relative;padding:44px 24px;z-index:1}
.mu-hero-h{margin:0;font-size:44px;font-weight:800;letter-spacing:.05em;line-height:1.25;text-shadow:0 2px 16px rgba(0,0,0,.3);text-wrap:balance}
.mu-hero-sub{margin:16px 0 0;font-size:16px;opacity:.95;letter-spacing:.02em;text-wrap:balance}
.mu-hero-btn{display:inline-block;margin-top:26px;padding:13px 44px;border:2px solid currentColor;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;transition:.2s}
.mu-hero-btn:hover{background:var(--mu-hbtn-hbg,#fff);color:var(--mu-hbtn-hcolor,#111)}

.mu-figfx{position:relative;display:block;overflow:hidden}
.mu-figfx img{display:block;width:100%;height:auto}
.mu-ovl{position:absolute;inset:0;pointer-events:none}

.mu-h{margin:64px 20px 28px;font-weight:800}
.mu-h>span{position:relative;display:inline-block;padding-bottom:12px}
${headAfter}
h2.mu-h{font-size:26px;letter-spacing:.02em}h3.mu-h{font-size:20px}h4.mu-h{font-size:17px}
.mu-wrap>.mu-h:first-child{margin-top:32px}

.mu-rich{margin:56px auto 8px;max-width:680px;padding:0 24px}
.mu-rich-t{margin:0 0 10px;font-size:23px;font-weight:800;letter-spacing:.02em;color:var(--mu-primary)}
.mu-rich-l{margin:0;color:#5a5a5a;font-size:15px;line-height:2}
.mu-text{margin:20px auto;max-width:640px;padding:0 24px;color:#444;line-height:2}

.mu-grid{display:grid;margin:24px 16px}
.mu-grid-2{grid-template-columns:1fr 1fr}
.mu-grid-3{grid-template-columns:1fr 1fr 1fr}
.mu-grid img{border-radius:var(--mu-grid-r,var(--mu-radius))}

.mu-banner{margin:22px 16px}
.mu-banner-cap{text-align:center;font-size:13px;margin-top:8px}

.mu-iconmenu{display:grid;grid-template-columns:repeat(var(--mu-ico-cols,4),minmax(0,1fr));gap:8px;margin:22px 16px}
.mu-ico{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:6px;text-decoration:none;font-size:11px;font-weight:600;line-height:1.35;color:var(--mu-ico-color,#333);padding:13px 6px;border:1px solid var(--mu-ico-border,#eee);border-radius:var(--mu-ico-r,var(--mu-radius));background:var(--mu-ico-bg,#fff);transition:.15s}
.mu-ico:hover{border-color:var(--mu-ico-hover,var(--mu-primary));transform:translateY(-2px)}
.mu-ico>span{max-width:100%;text-align:center;overflow-wrap:break-word;word-break:keep-all}
.mu-ico-img{width:var(--mu-ico-size,42px);height:var(--mu-ico-size,42px);object-fit:contain;border-radius:0;flex:0 0 auto}
/* 項目5個以上：横スクロールの帯。スマホ=スワイプ（バーなし）、PC=細いスクロールバー＋ホイール／ドラッグ */
.mu-iconmenu.mu-ico-scroll{display:flex;grid-template-columns:none;gap:10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;padding:2px;scrollbar-width:none}
.mu-iconmenu.mu-ico-scroll::-webkit-scrollbar{display:none}
.mu-iconmenu.mu-ico-scroll .mu-ico{flex:0 0 auto;width:auto;min-width:76px;padding-left:16px;padding-right:16px;scroll-snap-align:start}
.mu-iconmenu.mu-ico-scroll .mu-ico>span{white-space:nowrap;overflow:visible}
@media (pointer:fine){
  .mu-iconmenu.mu-ico-scroll{padding-bottom:10px;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.28) transparent;cursor:grab}
  .mu-iconmenu.mu-ico-scroll.mu-grabbing{cursor:grabbing;scroll-snap-type:none}
  .mu-iconmenu.mu-ico-scroll.mu-grabbing .mu-ico{pointer-events:none}
  .mu-iconmenu.mu-ico-scroll::-webkit-scrollbar{display:block;height:8px}
  .mu-iconmenu.mu-ico-scroll::-webkit-scrollbar-track{background:transparent}
  .mu-iconmenu.mu-ico-scroll::-webkit-scrollbar-thumb{background:rgba(0,0,0,.22);border-radius:99px}
  .mu-iconmenu.mu-ico-scroll::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.36)}
}

.mu-slideshow{position:relative;margin:22px 16px;border-radius:var(--mu-radius);overflow:hidden}
.mu-slide{display:none}.mu-slide[data-active]{display:block}
.mu-slide img{border-radius:0}
.mu-dots{position:absolute;left:0;right:0;bottom:12px;display:flex;gap:6px;justify-content:center}
.mu-dots button{width:8px;height:8px;border:0;border-radius:999px;background:rgba(255,255,255,.55);cursor:pointer}
.mu-dots button[data-active]{background:var(--mu-dot,#fff)}

.mu-cards{display:grid;grid-template-columns:repeat(var(--mu-cols,3),1fr);gap:12px;margin:22px 16px}
.mu-card{position:relative;display:flex;flex-direction:column;text-decoration:none;color:#333;border:1px solid var(--mu-card-border,#eee);border-radius:var(--mu-card-r,var(--mu-radius));overflow:hidden;background:var(--mu-card-bg,#fff);transition:.18s}
.mu-card:hover{box-shadow:0 10px 26px rgba(0,0,0,.1);transform:translateY(-3px)}
.mu-card img{aspect-ratio:1/1;object-fit:cover;border-radius:0}
.mu-card-name{padding:10px 10px 2px;font-size:13px;font-weight:600;line-height:1.55;color:var(--mu-name-color,#333);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mu-card-price{padding:0 10px 12px;font-size:15px;font-weight:800;color:var(--mu-price-color,var(--mu-primary))}
.mu-rank-badge{position:absolute;top:0;left:0;z-index:2;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:var(--mu-primary);color:#fff;font-weight:800;font-size:14px;border-bottom-right-radius:14px}
.mu-card:nth-child(1):not(.mu-badge-custom) .mu-rank-badge{background:#c9a227}
.mu-card:nth-child(2):not(.mu-badge-custom) .mu-rank-badge{background:#9aa0a6}
.mu-card:nth-child(3):not(.mu-badge-custom) .mu-rank-badge{background:#b06a3b}
.mu-badge-custom .mu-rank-badge{background:var(--mu-badge,var(--mu-primary))}

.mu-coupon{display:flex;flex-direction:column;align-items:center;gap:4px;margin:22px 16px;padding:24px 16px;border-radius:var(--mu-radius);color:#fff;text-decoration:none;text-align:center;background:var(--mu-primary)}
.mu-coupon-t{max-width:100%;font-size:19px;font-weight:800;text-wrap:balance}
.mu-coupon-d{max-width:100%;font-size:13px;opacity:.92;text-wrap:balance}
.mu-coupon-code{margin-top:8px;padding:5px 14px;background:rgba(255,255,255,.18);border-radius:6px;font-size:13px;letter-spacing:.06em}

.mu-countdown{display:flex;flex-direction:column;align-items:center;gap:6px;margin:22px 16px;padding:20px;border-radius:var(--mu-radius);text-align:center}
.mu-cd-t{font-size:14px;font-weight:700;letter-spacing:.08em}
.mu-cd-nums{font-size:24px;font-weight:800;font-variant-numeric:tabular-nums}
.mu-cd-nums b{font-size:26px;color:var(--mu-cd-accent,inherit)}

.mu-btn{display:inline-block;padding:15px 36px;border-radius:var(--mu-radius);text-decoration:none;font-weight:800;font-size:15px;transition:.15s;box-shadow:0 2px 0 rgba(0,0,0,.14);background:var(--mu-btn-bg,var(--mu-primary));color:var(--mu-btn-color,#fff)}
.mu-btn:hover{background:var(--mu-btn-hbg,var(--mu-btn-bg,var(--mu-primary)));color:var(--mu-btn-hcolor,var(--mu-btn-color,#fff));filter:brightness(1.04);transform:translateY(-1px)}
.mu-btn-sm{padding:9px 22px;font-size:13px}
.mu-btn-lg{padding:19px 56px;font-size:17px}

.mu-hr{border:0;border-top:1px solid #e5e5e5;margin:30px auto}
.mu-embed{position:relative;margin:22px 16px;aspect-ratio:16/9}
.mu-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:var(--mu-radius)}
.mu-auto{margin:22px 16px;padding:30px 12px;border:2px dashed #cbb;border-radius:12px;text-align:center;color:#a06;font-size:13px;background:#fdf6f8}

/* 特徴リスト */
.mu-features{list-style:none;margin:32px auto;padding:0 24px;max-width:680px}
.mu-features li{display:flex;gap:20px;padding:22px 0;border-bottom:1px dashed #e5e5e5}
.mu-features li:last-child{border-bottom:0}
.mu-feat-n{flex:0 0 auto;min-width:28px;font-size:22px;font-weight:800;color:var(--mu-accent);font-variant-numeric:tabular-nums;line-height:1.3}
.mu-features b{font-size:16px;letter-spacing:.01em}
.mu-features p{margin:6px 0 0;color:#666;font-size:14px;line-height:1.9}

/* ステップ */
.mu-steps{list-style:none;margin:32px auto;padding:0 24px;max-width:620px}
.mu-steps li{display:flex;gap:18px;padding:18px 0;position:relative}
.mu-steps li:not(:last-child)::after{content:"";position:absolute;left:16px;top:52px;bottom:-4px;width:2px;background:#ececec}
.mu-step-n{flex:0 0 auto;width:34px;height:34px;border-radius:50%;background:var(--mu-primary);color:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;z-index:1}
.mu-steps b{font-size:15px}
.mu-steps p{margin:5px 0 0;color:#666;font-size:13.5px;line-height:1.85}

/* FAQ */
.mu-faq{max-width:680px;margin:28px auto;padding:0 24px}
.mu-faq-item{padding:22px 4px;border-bottom:1px solid #ececec}
.mu-faq-item:first-child{border-top:1px solid #ececec}
.mu-faq-q{margin:0;display:flex;gap:12px;font-weight:700;font-size:15px;line-height:1.7}
.mu-faq-q span{flex:0 0 auto;width:22px;height:22px;margin-top:2px;border-radius:6px;background:var(--mu-primary);color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center}
.mu-faq-a{margin:10px 0 0 34px;color:#585858;font-size:14px;line-height:1.95}

/* お客様の声 */
.mu-reviews{display:grid;grid-template-columns:repeat(var(--mu-rv-cols,2),1fr);gap:16px;max-width:760px;margin:28px auto 0;padding:0 24px}
.mu-review{position:relative;margin:0;padding:28px 24px 22px;border:1px solid #ececec;border-radius:var(--mu-radius);background:#fff}
.mu-review::before{content:"\\201C";position:absolute;top:2px;left:16px;font-size:46px;line-height:1;color:var(--mu-primary);opacity:.22;font-family:Georgia,"Times New Roman",serif}
.mu-review blockquote{margin:0;font-size:14px;line-height:1.95;color:#333}
.mu-review figcaption{margin-top:16px;font-size:12px;font-weight:700;color:#333}
.mu-review figcaption span{margin-left:8px;font-weight:400;color:#9a9a9a}
.mu-review-note{max-width:760px;margin:14px auto 0;padding:0 24px;font-size:11px;color:#aaa;text-align:center}

/* 注意書き */
.mu-notice{max-width:680px;margin:44px auto 0;padding:18px 24px 0;border-top:1px solid #eee;color:#a5a5a5;font-size:11.5px;line-height:1.95}

/* お知らせバー */
.mu-infobar{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 0 12px;padding:11px 18px;text-align:center;font-size:13px;font-weight:700;letter-spacing:.02em;text-decoration:none;background:var(--mu-primary);color:#fff}
.mu-infobar-cta{flex:0 0 auto;padding:3px 12px;border:1px solid currentColor;border-radius:999px;font-size:11px}

/* ギャラリー */
.mu-gallery{display:grid;grid-template-columns:repeat(var(--mu-gl-cols,3),1fr);gap:var(--mu-gl-gap,8px);margin:22px 16px}
.mu-gitem img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:var(--mu-gl-r,var(--mu-radius));transition:.18s}
.mu-gitem a:hover img{filter:brightness(.94)}
.mu-gallery .mu-img-ph{aspect-ratio:1/1;min-height:0}

/* 動画 */
.mu-video{margin:22px 16px}
.mu-video-fr{position:relative;border-radius:var(--mu-radius);overflow:hidden;background:#000}
.mu-video-fr iframe,.mu-video-fr video{position:absolute;inset:0;width:100%;height:100%;border:0;object-fit:cover}
.mu-video-fr .mu-img-ph{position:absolute;inset:0;min-height:0;height:100%}

/* 画像＋テキスト（左右） */
.mu-media{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center;margin:40px 16px}
.mu-media-rev .mu-media-img{order:2}
.mu-media-img img{display:block;width:100%;border-radius:var(--mu-radius)}
.mu-media-h{margin:0 0 12px;font-size:21px;font-weight:800;letter-spacing:.02em;color:var(--mu-primary)}
.mu-media-p{margin:0 0 16px;color:#555;font-size:14px;line-height:1.95}

/* ビフォー / アフター */
.mu-ba{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:24px 16px}
.mu-ba-cell{position:relative;margin:0}
.mu-ba-cell img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--mu-radius)}
.mu-ba-cell .mu-img-ph{aspect-ratio:4/3;min-height:0}
.mu-ba-tag{position:absolute;top:10px;left:10px;z-index:1;padding:4px 12px;border-radius:999px;background:rgba(0,0,0,.62);color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em}
.mu-ba-cell:last-child .mu-ba-tag{background:var(--mu-primary)}

/* ロゴ帯 */
.mu-logos{margin:34px 16px;text-align:center}
.mu-logos-t{margin:0 0 16px;font-size:11px;letter-spacing:.14em;color:#9a9a9a;font-weight:700}
.mu-logos-row{display:flex;flex-wrap:wrap;gap:12px 30px;align-items:center;justify-content:center}
.mu-logo img{max-height:34px;width:auto;object-fit:contain}
.mu-logo .mu-img-ph{width:96px;height:34px;min-height:0;font-size:8px}
.mu-logos-g .mu-logo img{filter:grayscale(1);opacity:.72}

/* タブ */
.mu-tabs{max-width:720px;margin:28px auto;padding:0 24px}
.mu-tab-nav{display:flex;gap:4px;border-bottom:2px solid #ececec;overflow-x:auto;scrollbar-width:none}
.mu-tab-nav::-webkit-scrollbar{display:none}
.mu-tab{flex:0 0 auto;padding:12px 18px;border:0;background:none;font:inherit;font-size:14px;font-weight:700;color:#999;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s}
.mu-tab.is-active{color:var(--mu-primary);border-bottom-color:var(--mu-primary)}
.mu-tab-body{padding:22px 2px;font-size:14px;line-height:1.95;color:#444}
.mu-tab-pane{display:none}.mu-tab-pane.is-active{display:block}

/* アコーディオン */
.mu-acc{max-width:720px;margin:28px auto;padding:0 24px}
.mu-acc-item{border-bottom:1px solid #ececec}
.mu-acc-item:first-child{border-top:1px solid #ececec}
.mu-acc-item>summary{list-style:none;cursor:pointer;padding:18px 32px 18px 4px;position:relative;font-weight:700;font-size:15px;line-height:1.7}
.mu-acc-item>summary::-webkit-details-marker{display:none}
.mu-acc-mk{position:absolute;right:4px;top:22px;width:13px;height:13px}
.mu-acc-mk::before,.mu-acc-mk::after{content:"";position:absolute;background:var(--mu-primary);transition:.2s}
.mu-acc-mk::before{left:0;right:0;top:6px;height:2px}
.mu-acc-mk::after{top:0;bottom:0;left:6px;width:2px}
.mu-acc-item[open] .mu-acc-mk::after{transform:rotate(90deg);opacity:0}
.mu-acc-body{padding:0 4px 20px;color:#585858;font-size:14px;line-height:1.95}

/* 注目商品スポットライト */
.mu-spot{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:34px 16px;border:1px solid #ececec;border-radius:var(--mu-radius);overflow:hidden;background:#fff}
.mu-spot-rev .mu-spot-img{order:2}
.mu-spot-img img{display:block;width:100%;height:100%;object-fit:cover}
.mu-spot-img .mu-img-ph{height:100%;min-height:220px}
.mu-spot-body{padding:34px 30px;display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.mu-spot-tag{padding:4px 12px;border-radius:999px;background:var(--mu-primary);color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em}
.mu-spot-name{margin:0;font-size:22px;font-weight:800;line-height:1.4}
.mu-spot-desc{margin:0;color:#666;font-size:13.5px;line-height:1.9}
.mu-spot-price{font-size:22px;font-weight:800;color:var(--mu-primary)}
.mu-spot-body .mu-btn{margin-top:4px}

/* 料金プラン */
.mu-pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:28px 16px}
.mu-plan{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px 20px;border:1px solid #e6e6e6;border-radius:var(--mu-radius);background:#fff;text-align:center}
.mu-plan-rec{border-color:var(--mu-primary);border-width:2px;box-shadow:0 12px 30px rgba(0,0,0,.08)}
.mu-plan-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);padding:4px 14px;border-radius:999px;background:var(--mu-primary);color:#fff;font-size:11px;font-weight:700}
.mu-plan-name{font-size:14px;font-weight:700;color:#555}
.mu-plan-price{font-size:26px;font-weight:800;color:var(--mu-primary)}
.mu-plan-feats{list-style:none;margin:6px 0;padding:0;font-size:12.5px;color:#666;line-height:1.5}
.mu-plan-feats li{padding:6px 0;border-top:1px dashed #ececec}
.mu-plan-feats li:first-child{border-top:0}

/* 比較表 */
.mu-compare-wrap{margin:26px 16px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.mu-compare{width:100%;min-width:460px;border-collapse:collapse;font-size:13px}
.mu-compare th,.mu-compare td{padding:12px 14px;border:1px solid #e8e8e8;text-align:center}
.mu-compare thead th{background:#f6f6f6;font-weight:700;font-size:12.5px}
.mu-compare tbody th{background:#fafafa;text-align:left;font-weight:700}
.mu-compare .mu-cmp-hl{background:color-mix(in srgb,var(--mu-primary) 10%,#fff);position:relative}
.mu-compare thead .mu-cmp-hl{background:var(--mu-primary);color:#fff}
.mu-cmp-o{color:var(--mu-primary);font-weight:800;font-size:15px}
.mu-cmp-x{color:#c9c9c9;font-weight:700}

/* 実績カウンター */
.mu-stats{display:grid;grid-template-columns:repeat(var(--mu-st-cols,3),1fr);gap:14px;margin:36px 16px;text-align:center}
.mu-stat b{display:block;font-size:32px;font-weight:800;line-height:1.15;color:var(--mu-st-color,var(--mu-primary));font-variant-numeric:tabular-nums;letter-spacing:.01em}
.mu-stat span{display:block;margin-top:4px;font-size:12px;font-weight:600;color:#888}

/* 安心バッジ帯 */
.mu-trusts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:24px 16px}
.mu-trust{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:130px;padding:13px 18px;border:1px solid #e7e7e7;border-radius:var(--mu-radius);background:#fafafa}
.mu-trust b{font-size:13px;color:var(--mu-primary)}
.mu-trust small{font-size:10.5px;color:#8a8a8a}

/* 評価サマリー */
.mu-rating{max-width:520px;margin:28px auto;padding:24px 26px;border:1px solid #ececec;border-radius:var(--mu-radius);background:#fff}
.mu-rt-head{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.mu-rt-score{font-size:40px;font-weight:800;color:var(--mu-primary);line-height:1}
.mu-rt-stars{position:relative;display:inline-block;font-size:20px;line-height:20px;letter-spacing:3px;white-space:nowrap}
.mu-rt-stars::before{content:"★★★★★";color:#e2e2e2}
.mu-rt-stars-on{position:absolute;left:0;top:0;height:100%;overflow:hidden;white-space:nowrap}
.mu-rt-stars-on::before{content:"★★★★★";color:#f6b73c}
.mu-rt-count{font-size:12px;color:#888}
.mu-rt-dist{margin-top:14px;display:flex;flex-direction:column;gap:5px}
.mu-rt-row{display:flex;align-items:center;gap:8px;font-size:11px;color:#888}
.mu-rt-track{flex:1;height:7px;border-radius:99px;background:#eee;overflow:hidden}
.mu-rt-fill{height:100%;background:#f6b73c}
.mu-rt-pct{width:34px;text-align:right}

/* 吹き出し会話 */
.mu-talk{max-width:640px;margin:28px auto;padding:0 24px;display:flex;flex-direction:column;gap:14px}
.mu-talk-row{display:flex;align-items:flex-start;gap:10px}
.mu-talk-r{flex-direction:row-reverse}
.mu-talk-av{flex:0 0 auto;width:36px;height:36px;border-radius:50%;background:#e3e3e3}
.mu-talk-r .mu-talk-av{background:color-mix(in srgb,var(--mu-primary) 30%,#fff)}
.mu-bubble{position:relative;max-width:76%;margin:0;padding:12px 16px;border-radius:14px;font-size:13.5px;line-height:1.8;background:#f1f1f1;color:#333}
.mu-talk-r .mu-bubble{background:var(--mu-primary);color:#fff}

/* タイムライン */
.mu-timeline{list-style:none;margin:30px auto;padding:0 24px;max-width:640px}
.mu-timeline li{display:flex;gap:18px;padding:6px 0 22px;position:relative}
.mu-timeline li::before{content:"";position:absolute;left:6px;top:12px;width:9px;height:9px;border-radius:50%;background:var(--mu-primary)}
.mu-timeline li:not(:last-child)::after{content:"";position:absolute;left:10px;top:20px;bottom:0;width:2px;background:#e6e6e6}
.mu-tl-date{flex:0 0 auto;padding-left:22px;width:104px;font-size:12px;font-weight:800;color:var(--mu-primary)}
.mu-tl-c b{font-size:14.5px}
.mu-tl-c p{margin:4px 0 0;color:#666;font-size:13px;line-height:1.85}

/* こんな方におすすめ */
.mu-rec{max-width:600px;margin:28px auto;padding:26px 28px;border:1px solid #ececec;border-radius:var(--mu-radius);background:#fafafa}
.mu-rec-t{margin:0 0 14px;font-size:16px;font-weight:800;text-align:center;color:var(--mu-primary)}
.mu-rec-list{list-style:none;margin:0;padding:0}
.mu-rec-list li{position:relative;padding:9px 0 9px 30px;font-size:14px;line-height:1.7;border-top:1px dashed #e2e2e2}
.mu-rec-list li:first-child{border-top:0}
.mu-rec-list li::before{content:"";position:absolute;left:2px;top:13px;width:14px;height:8px;border-left:2px solid var(--mu-primary);border-bottom:2px solid var(--mu-primary);transform:rotate(-45deg)}

/* 営業日カレンダー */
.mu-cal{max-width:420px;margin:28px auto;padding:20px;border:1px solid #ececec;border-radius:var(--mu-radius);background:#fff}
.mu-cal-h{margin:0 0 12px;text-align:center;font-size:14px;font-weight:800}
.mu-cal-t{width:100%;border-collapse:collapse;table-layout:fixed}
.mu-cal-t th{padding:6px 0;font-size:11px;color:#999;font-weight:700}
.mu-cal-t td{padding:7px 0;text-align:center;font-size:12.5px;font-variant-numeric:tabular-nums}
.mu-cal-sun{color:#d0424b}.mu-cal-sat{color:#3a72c4}
.mu-cal-off{background:color-mix(in srgb,var(--mu-primary) 12%,#fff);color:var(--mu-primary);font-weight:800;border-radius:6px}
.mu-cal-note{margin:12px 0 0;font-size:11px;color:#888;line-height:1.7;display:flex;gap:6px;align-items:flex-start}
.mu-cal-key{flex:0 0 auto;width:14px;height:14px;margin-top:2px;border-radius:4px;background:color-mix(in srgb,var(--mu-primary) 12%,#fff)}

.mu-pc-only{display:block}.mu-sp-only{display:none}
@media(max-width:640px){
  .mu-grid-2,.mu-grid-3{grid-template-columns:1fr}
  .mu-cards{grid-template-columns:repeat(2,1fr)}
  .mu-reviews{grid-template-columns:1fr}
  .mu-hero{min-height:calc(var(--mu-hero-h,360px) * .82)}.mu-hero-h{font-size:30px}
  .mu-h{margin:52px 20px 24px}h2.mu-h{font-size:22px}
  .mu-media,.mu-spot,.mu-pricing,.mu-stats{grid-template-columns:1fr}
  .mu-media{gap:16px;margin:28px 16px}
  .mu-media-rev .mu-media-img,.mu-spot-rev .mu-spot-img{order:0}
  .mu-spot-body{padding:24px 22px}
  .mu-gallery{--mu-gl-cols:2}
  .mu-stats .mu-stat b{font-size:26px}
  .mu-pc-only{display:none}.mu-sp-only{display:block}
}
${darkCss}`;
}

export const RUNTIME_JS = `<script>
(function(){
  document.querySelectorAll('.mu-slideshow').forEach(function(s){
    var slides=s.querySelectorAll('.mu-slide'),dots=s.querySelectorAll('[data-dot]'),i=0;
    if(slides.length<2)return;
    function go(n){slides.forEach(function(x){x.removeAttribute('data-active')});dots.forEach(function(x){x.removeAttribute('data-active')});
      i=(n+slides.length)%slides.length;slides[i].setAttribute('data-active','1');if(dots[i])dots[i].setAttribute('data-active','1');}
    dots.forEach(function(d,n){d.addEventListener('click',function(){go(n)})});
    setInterval(function(){go(i+1)},parseInt(s.dataset.interval,10)||4000);
  });
  document.querySelectorAll('.mu-ico-scroll').forEach(function(el){
    // 縦ホイールを横スクロールに変換（PC）
    el.addEventListener('wheel',function(e){
      if(Math.abs(e.deltaY)<=Math.abs(e.deltaX))return;
      var max=el.scrollWidth-el.clientWidth;if(max<=0)return;
      if((el.scrollLeft<=0&&e.deltaY<0)||(el.scrollLeft>=max-1&&e.deltaY>0))return;
      el.scrollLeft+=e.deltaY;e.preventDefault();
    },{passive:false});
    // つかんでドラッグでスクロール（PC）
    var down=false,sx=0,sl=0,moved=0;
    el.addEventListener('pointerdown',function(e){
      if(e.pointerType==='touch')return;
      down=true;moved=0;sx=e.clientX;sl=el.scrollLeft;el.classList.add('mu-grabbing');
    });
    window.addEventListener('pointermove',function(e){
      if(!down)return;var dx=e.clientX-sx;moved+=Math.abs(dx);el.scrollLeft=sl-dx;
    });
    window.addEventListener('pointerup',function(){
      if(!down)return;down=false;el.classList.remove('mu-grabbing');
    });
    // ドラッグ直後のクリックでリンク遷移しない
    el.addEventListener('click',function(e){if(moved>6){e.preventDefault();e.stopPropagation();}},true);
    el.addEventListener('dragstart',function(e){if(down)e.preventDefault();});
  });
  document.querySelectorAll('.mu-tabs').forEach(function(t){
    var btns=t.querySelectorAll('.mu-tab'),panes=t.querySelectorAll('.mu-tab-pane');
    btns.forEach(function(b){b.addEventListener('click',function(){
      var k=b.getAttribute('data-tab');
      btns.forEach(function(x){x.classList.toggle('is-active',x===b)});
      panes.forEach(function(x){x.classList.toggle('is-active',x.getAttribute('data-pane')===k)});
    })});
  });
  document.querySelectorAll('.mu-countdown').forEach(function(c){
    var dl=new Date(c.dataset.deadline).getTime();if(isNaN(dl))return;
    function t(){var d=dl-Date.now();if(d<0)d=0;
      var s=Math.floor(d/1000),D=Math.floor(s/86400),H=Math.floor(s%86400/3600),M=Math.floor(s%3600/60),S=s%60;
      var p=function(n){return('0'+n).slice(-2)};
      c.querySelector('[data-d]').textContent=D;c.querySelector('[data-h]').textContent=p(H);
      c.querySelector('[data-m]').textContent=p(M);c.querySelector('[data-s]').textContent=p(S);}
    t();setInterval(t,1000);
  });
})();
</script>`;

export interface BuildOptions {
  title: string;
  baseUrl: string;
  target: "rakuten" | "yahoo";
  theme: Theme;
  /** プレビュー編集用：各ブロックを data-mu-block 付き div でラップする（書き出しには使わない） */
  wrap?: boolean;
}

const needsJs = (blocks: Block[]) =>
  blocks.some(
    (b) =>
      b.type === "slideshow" ||
      b.type === "countdown" ||
      b.type === "tabs" ||
      (b.type === "iconmenu" && (b.props.items || "").split(/\r?\n/).filter((x) => x.trim()).length >= 5),
  );

export function buildBodyHtml(blocks: Block[], baseUrl: string, wrap = false): string {
  const inner = blocks
    .map((b) => {
      const h = blockHtml(b, baseUrl);
      return wrap ? `  <div data-mu-block="${esc(b.id)}" draggable="true">\n    ${h}\n  </div>` : "  " + h;
    })
    .join("\n");
  return `<div class="mu-wrap">\n${inner}\n</div>`;
}

export function buildInlineHtml(blocks: Block[], opts: BuildOptions): string {
  const js = needsJs(blocks) ? "\n" + RUNTIME_JS : "";
  return `<style>\n${buildCss(opts.theme)}</style>\n${buildBodyHtml(blocks, opts.baseUrl, opts.wrap)}${js}`;
}

export function buildFullHtml(blocks: Block[], opts: BuildOptions): string {
  const js = needsJs(blocks) ? "\n" + RUNTIME_JS : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
${buildBodyHtml(blocks, opts.baseUrl)}${js}
</body>
</html>
`;
}

// ── テンプレート（構成 + 既定テーマ） ─────────
const rid = () => Math.random().toString(36).slice(2, 9);
const mk = (type: BlockType, props: Partial<Record<string, string>> = {}): Block => ({
  id: rid(),
  type,
  props: { ...BLOCK_DEFAULT[type], ...props } as Record<string, string>,
});

export interface Template {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** 構成タイプ（起承転結・カタログ回遊 など） */
  flow: string;
  desc: string;
  /** ブロックの流れの説明（1行） */
  outline: string;
  theme: Theme;
  /** target を渡すとモールに合わせて文言を差し替える（例：楽天＝スーパーSALE / Yahoo＝BIG SALE） */
  make: (target?: "rakuten" | "yahoo") => Block[];
}

const t = (primary: string, accent: string, extra: Partial<Theme> = {}): Theme => ({
  font: "gothic", primary, accent, radius: "soft", heading: "bar", bg: "#ffffff", ...extra,
});
export const TEMPLATES: Template[] = [
  // セール特集：起承転結型
  {
    id: "sale", name: "セール・イベント特集", icon: "ticket", color: "#c8102e",
    flow: "起承転結型",
    desc: "大型セール・イベント向け。緊急性と本命商品で一気に売り切る構成。",
    outline: "ヒーロー → 緊急性 → 目玉 → ランキング → カテゴリ回遊 → 安心材料 → FAQ → 決めボタン",
    theme: t("#c8102e", "#e0233d", { radius: "sharp" }),
    make: (target) => [
      target === "yahoo"
        ? mk("hero", { heading: "BIG SALE", sub: "期間限定 全ストア対象・最大70%OFF＋PayPayポイント", btnLabel: "対象商品を見る", minH: "440", overlay: "45" })
        : mk("hero", { heading: "SUPER SALE", sub: "期間限定 全品対象・最大70%OFF", btnLabel: "対象商品を見る", minH: "440", overlay: "45" }),
      mk("countdown", { title: "セール終了まで残り" }),
      target === "yahoo"
        ? mk("coupon", { title: "全ストアで使える10%OFFクーポン", detail: "5,000円以上・5のつく日／ゾロ目の日はポイントもアップ" })
        : mk("coupon", { title: "エントリーで使える10%OFFクーポン", detail: "5,000円以上・期間中何度でも・先着1,000名" }),
      mk("heading", { text: "＼ 今回の目玉商品 ／" }),
      mk("productgrid", { cols: "2" }),
      mk("banner", { caption: "▲ 数量限定・なくなり次第終了" }),
      mk("heading", { text: "リアルタイム売れ筋ランキング" }),
      mk("ranking"),
      mk("heading", { text: "カテゴリから探す" }),
      mk("iconmenu", { cols: "5", items: "レディース||#\nメンズ||#\nシューズ||#\nバッグ||#\n小物||#" }),
      mk("heading", { text: "セール期間中も安心" }),
      mk("featurelist", { style: "check", items: "3,980円以上で送料無料|全国一律。北海道・沖縄・離島も対象です。\n30日以内は返品OK|イメージと違った場合も安心。タグ付きなら送料当店負担。\n最短翌日お届け|13時までのご注文は当日出荷（一部地域を除く）。" }),
      mk("heading", { text: "よくあるご質問" }),
      target === "yahoo"
        ? mk("faq", { items: "クーポンはセール価格に併用できますか？|はい、対象商品で自動適用されます。5のつく日・ゾロ目の日のポイントアップとも併用可能です。\n在庫切れの再入荷はありますか？|数量限定のため、基本的に再入荷はございません。気になる商品はお早めに。\nラッピングは対応していますか？|有料（+330円）で承ります。商品ページのオプションからお選びください。" })
        : mk("faq", { items: "クーポンはセール価格に併用できますか？|はい、エントリー後は対象商品で自動適用されます。他のポイントアップとも併用可能です。\n在庫切れの再入荷はありますか？|数量限定のため、基本的に再入荷はございません。気になる商品はお早めに。\nラッピングは対応していますか？|有料（+330円）で承ります。商品ページのオプションからお選びください。" }),
      mk("button", { label: "全セール商品を見る", size: "lg", full: "1" }),
      mk("countdown", { title: "＼ お見逃しなく ／ 終了まで" }),
      mk("notice", { text: "※表示価格は税込です。※他クーポン・ポイントアップとの併用条件は各商品ページをご確認ください。※画像はイメージです。" }),
    ],
  },
  // アパレル：カタログ回遊型
  {
    id: "apparel", name: "アパレル・雑貨", icon: "sparkles", color: "#141414",
    flow: "カタログ回遊型",
    desc: "新作・スタイリング・ランキングで回遊させ、ブランド世界観で締める構成。",
    outline: "スライド → カテゴリ → 新作 → 特集バナー → スタイリング → ランキング → ブランド → SNS → 会員導線",
    theme: t("#141414", "#c9a227", { radius: "sharp", heading: "plain" }),
    make: () => [
      mk("slideshow"),
      mk("iconmenu", { cols: "6", items: "TOPS||#\nOUTER||#\nBOTTOMS||#\nDRESS||#\nSHOES||#\nBAG||#" }),
      mk("richtext", { title: "NEW ARRIVALS", lead: "毎週水曜更新。今週入荷したアイテムをいち早くチェック。" }),
      mk("productgrid", { cols: "3" }),
      mk("button", { label: "新作をすべて見る", size: "md" }),
      mk("image2col"),
      mk("heading", { text: "STAFF STYLING" }),
      mk("image3col"),
      mk("richtext", { title: "MONTHLY RANKING", lead: "今もっとも支持されているアイテム。" }),
      mk("ranking"),
      mk("richtext", { title: "ABOUT US", lead: "日常に少しの特別を。素材と縫製にこだわり、長く着られる服を作っています。" }),
      mk("featurelist", { items: "国内の職人と作る|パターンから縫製まで、信頼できる工場と一つずつ。\n定番を、少しずつ良く|流行を追いすぎず、毎年アップデートを重ねています。\n手に取りやすい価格|中間コストを省き、質のわりに手が届く価格に。" }),
      mk("heading", { text: "Instagram" }),
      mk("sns", { kind: "instagram" }),
      mk("banner", { caption: "会員登録で初回10%OFF ＆ 送料無料" }),
      mk("button", { label: "会員登録して特典を受け取る", size: "lg" }),
      mk("notice", { text: "※画面上の色味は環境により実物と異なる場合があります。※セール品は返品対象外の場合があります。" }),
    ],
  },
  // 食品・ギフト：ストーリー訴求型
  {
    id: "food", name: "食品・ギフト", icon: "box", color: "#1f6f4a",
    flow: "ストーリー訴求型",
    desc: "作り手の想いと品質の証拠で信頼を積み上げ、用途別に選ばせる構成。",
    outline: "ヒーロー → 想い → 3つのこだわり → お客様の声 → 人気ギフト → 用途で選ぶ → まとめ買い特典 → のし対応",
    theme: t("#1f6f4a", "#2e9163", { font: "rounded", radius: "round" }),
    make: () => [
      mk("hero", { heading: "産地直送の、ほんものの味", sub: "生産者から、あなたの食卓へ", overlay: "35", minH: "420" }),
      mk("richtext", { title: "私たちがお届けしたいもの", lead: "土づくりから収穫まで、手間を惜しまない生産者の畑から。いちばん美味しい瞬間を、そのまま食卓へ届けます。" }),
      mk("heading", { text: "3つのこだわり" }),
      mk("featurelist", { items: "契約農家からの直送|市場を通さず、畑から最短ルートでお届けします。\n収穫当日の発送体制|朝採れをその日のうちに箱詰め・発送。鮮度が違います。\n見えない部分まで検品|一つずつ手に取り、キズ・熟度を人の目で確認しています。" }),
      mk("heading", { text: "お客様の声" }),
      mk("reviews", { cols: "2", items: "贈った相手からすぐにお礼の電話が来ました。毎年これに決めています。|K.M さん|60代・女性\n鮮度が全然違う。スーパーのものが食べられなくなりました。|T.S さん|40代・男性\n包装も丁寧で、そのまま手土産にできました。|A.N さん|30代・女性", note: "※感想には個人差があります。" }),
      mk("heading", { text: "人気のギフト" }),
      mk("productgrid", { cols: "3" }),
      mk("heading", { text: "用途から選ぶ" }),
      mk("iconmenu", { cols: "5", items: "内祝い||#\nお中元||#\nお歳暮||#\n誕生日||#\n法要||#" }),
      mk("coupon", { title: "まとめ買いで送料無料＋200ポイント", detail: "3箱以上のご購入で自動適用" }),
      mk("featurelist", { style: "check", items: "無料のし対応|表書き・名入れを無料で承ります。カートの備考欄へ。\n日時・時間帯指定OK|お届け希望日を最短翌々日から指定できます。\nメッセージカード無料|手書き風の一言メッセージをお付けできます。" }),
      mk("button", { label: "ギフトを探す", size: "lg" }),
      mk("notice", { text: "※生ものにつき、お届け先不在が続くと品質保証ができかねます。※天候・収穫状況により発送が前後する場合があります。" }),
    ],
  },
  // コスメ：ベネフィット訴求型
  {
    id: "cosme", name: "コスメ・美容", icon: "award", color: "#c2185b",
    flow: "ベネフィット訴求型",
    desc: "悩みへの共感から入り、理由・成分・実績で納得させて初回購入へ導く構成。",
    outline: "ヒーロー → 悩み提起 → 選ばれる理由3つ → 成分 → ベストセラー → 愛用者の声 → 使い方 → 初回クーポン → 決めボタン",
    theme: t("#c2185b", "#e35c8a", { font: "mincho", heading: "underline" }),
    make: () => [
      mk("hero", { heading: "for your skin", sub: "肌本来の力を引き出す、シンプルなスキンケア", overlay: "25", minH: "420" }),
      mk("heading", { text: "こんなお悩み、ありませんか？" }),
      mk("featurelist", { style: "check", items: "夕方になると乾燥が気になる|日中の乾燥で、メイクがくすんで見える。\n自分の肌に合うか不安|新しいものを試すのが、いつも少し怖い。\n結局どれを選べばいいか分からない|情報が多すぎて、選びきれない。" }),
      mk("heading", { text: "選ばれる3つの理由" }),
      mk("featurelist", { items: "必要なものだけの処方|不要なものは入れず、届けたい成分は確かな濃度で。\n全成分を公開|パッケージにも公式サイトにも、すべて記載しています。\n続けやすい価格|毎日使うものだから、無理なく続けられる設計に。" }),
      mk("richtext", { title: "成分へのこだわり", lead: "保湿の要となる◯種のセラミド類似成分と、整肌成分をバランスよく配合。香料・着色料は不使用です。" }),
      mk("heading", { text: "BEST SELLER" }),
      mk("ranking"),
      mk("heading", { text: "愛用者の声" }),
      mk("reviews", { cols: "2", items: "肌が揺らぎにくくなった実感があります。もう手放せません。|30代・混合肌\nシンプルなのに、ちゃんと満たされる。使うたび安心します。|40代・乾燥肌\n家族で使えるので、洗面台がすっきりしました。|50代・普通肌", note: "※感想には個人差があり、効果を保証するものではありません。" }),
      mk("heading", { text: "ご使用方法" }),
      mk("steps", { items: "洗顔後、化粧水で整える|清潔な肌にたっぷりとなじませます。\n本品を適量とる|さくらんぼ大を手のひらに広げます。\n顔全体を包み込む|内側から外側へ、やさしくハンドプレス。\n乾燥が気になる部分に重ねる|目元・口元は少量を重ねづけ。" }),
      mk("coupon", { title: "初めての方へ・15%OFFクーポン", detail: "税込3,000円以上・お一人様1回限り" }),
      mk("button", { label: "定番セットを見る", size: "lg", full: "1" }),
      mk("notice", { text: "※お肌に異常が生じていないかよく注意してご使用ください。※乳幼児の手の届かないところに保管してください。" }),
    ],
  },
  // 単品リピート通販：縦長LP型
  {
    id: "lp", name: "単品ランディング（1商品訴求）", icon: "target", color: "#b25a3a",
    flow: "縦長LP型",
    desc: "1つの商品/セットに絞り、特徴・ストーリー・実績・声・FAQで購入まで導く縦長構成。",
    outline: "ヒーロー → FV補足 → 商品画像 → 特徴3点 → 開発ストーリー → 実績 → 期間限定 → 初回オファー → 声 → 使い方 → FAQ → 決めボタン → 注意書き",
    theme: t("#b25a3a", "#cf7b56", { radius: "soft" }),
    make: () => [
      mk("hero", { heading: "毎朝のスキンケアを、これひとつに", sub: "累計販売◯◯万本／リピート率◯◯%", btnLabel: "今すぐ試す", overlay: "35", minH: "460" }),
      mk("text", { text: "「時短なのに、手を抜きたくない」——そんな方のための、1本5役のオールインワン。", align: "center", size: "16" }),
      mk("image", { width: "90", radius: "16", shadow: "soft" }),
      mk("heading", { text: "選ばれる3つの特徴" }),
      mk("featurelist"),
      mk("richtext", { title: "開発ストーリー", lead: "「本当に必要なものだけ」を突き詰めて3年。処方を◯回作り直して、ようやく納得のいく1本になりました。" }),
      mk("heading", { text: "使用実感データ" }),
      mk("image2col"),
      mk("countdown", { title: "＼ 今だけ ／ 特別価格の終了まで" }),
      mk("coupon", { title: "初回限定 47%OFF＋送料無料", detail: "定期便の初回・いつでも解約OK" }),
      mk("heading", { text: "お客様の声" }),
      mk("reviews", { cols: "2" }),
      mk("heading", { text: "ご使用方法" }),
      mk("steps", { items: "洗顔・タオルドライ|清潔な肌に。こすらず押さえるように水分を取ります。\n適量を手に取る|さくらんぼ大を手のひらに広げます。\n顔全体になじませる|内側から外側へ、包み込むように。\n気になる部分は重ねづけ|目元・口元にもう一度。" }),
      mk("heading", { text: "よくあるご質問" }),
      mk("faq"),
      mk("button", { label: "初回47%OFFで試してみる", size: "lg", full: "1" }),
      mk("notice"),
    ],
  },
  // シンプル：ミニマル型
  {
    id: "simple", name: "シンプル（汎用）", icon: "layout", color: "#1f3a5f",
    flow: "ミニマル型",
    desc: "必要最小限。まず形にしたいとき・情報量が少ない店舗向け。",
    outline: "バナー → 見出し＋リード → 商品グリッド → 特集2カラム → カテゴリ → クーポン → ボタン",
    theme: t("#1f3a5f", "#2f5c94", { heading: "underline" }),
    make: () => [
      mk("banner"),
      mk("richtext", { title: "PICK UP", lead: "今月のおすすめアイテム" }),
      mk("productgrid", { cols: "3" }),
      mk("image2col"),
      mk("heading", { text: "カテゴリから探す" }),
      mk("iconmenu"),
      mk("coupon", { title: "フォロー＆お気に入りで100円OFF", detail: "税込1,000円以上でご利用いただけます" }),
      mk("button", { label: "商品一覧を見る" }),
    ],
  },
];
