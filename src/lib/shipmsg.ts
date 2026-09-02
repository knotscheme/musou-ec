/**
 * 発送・遅延・一部欠品・海外発送の連絡文テンプレート（主要6言語）と配送業者の追跡URL。
 * 全店舗共通（Shopify / 楽天 / Yahoo / Amazon いずれのメール機能・配信ツールにも貼れる）。
 *
 * 差し込みタグ:
 *   {shop} {name} {order} {product} {carrier} {tracking} {trackingUrl}
 *   {shipDate} {eta} {reason} {nextEta} {shippedItems} {backorderItems}
 */

import type { Locale } from "@/i18n/dictionaries";

export type NoticeType = "shipped" | "delay" | "partial" | "overseas";

export const NOTICE_LABEL: Record<NoticeType, string> = {
  shipped: "発送完了",
  delay: "発送遅延のお詫び",
  partial: "一部欠品・分割発送",
  overseas: "海外発送",
};

export interface ShipFields {
  shop: string;
  name: string;
  order: string;
  product: string;
  carrier: string;
  tracking: string;
  trackingUrl: string;
  shipDate: string;
  eta: string;
  reason: string;
  nextEta: string;
  shippedItems: string;
  backorderItems: string;
}

interface Tpl {
  subject: string;
  body: string;
}

export const SHIP_TEMPLATE: Record<NoticeType, Record<Locale, Tpl>> = {
  // ── 発送完了 ────────────────────────────────
  shipped: {
    ja: {
      subject: "【{shop}】ご注文商品を発送しました（{order}）",
      body: `{name} 様

このたびは {shop} をご利用いただきありがとうございます。
ご注文の商品を発送いたしましたのでお知らせします。

■ ご注文番号：{order}
■ 商品：{product}
■ 発送日：{shipDate}
■ お届け目安：{eta}
■ 配送業者：{carrier}
■ 追跡番号：{tracking}
■ 追跡：{trackingUrl}

商品に不備がございましたら、このメールへご返信ください。
今後ともよろしくお願いいたします。

{shop}`,
    },
    en: {
      subject: "[{shop}] Your order has shipped ({order})",
      body: `Dear {name},

Thank you for shopping with {shop}. Your order is on its way.

- Order number: {order}
- Item(s): {product}
- Shipped on: {shipDate}
- Estimated delivery: {eta}
- Carrier: {carrier}
- Tracking number: {tracking}
- Track your parcel: {trackingUrl}

If anything is wrong with your order, just reply to this email.

{shop}`,
    },
    zh: {
      subject: "【{shop}】您的订单已发货（{order}）",
      body: `{name} 您好：

感谢您在 {shop} 购物，您的订单已发出。

- 订单编号：{order}
- 商品：{product}
- 发货日期：{shipDate}
- 预计送达：{eta}
- 快递公司：{carrier}
- 运单号：{tracking}
- 物流查询：{trackingUrl}

如商品有任何问题，请直接回复此邮件。

{shop}`,
    },
    de: {
      subject: "[{shop}] Deine Bestellung wurde versandt ({order})",
      body: `Hallo {name},

vielen Dank für deinen Einkauf bei {shop}. Deine Bestellung ist unterwegs.

- Bestellnummer: {order}
- Artikel: {product}
- Versanddatum: {shipDate}
- Voraussichtliche Lieferung: {eta}
- Versanddienstleister: {carrier}
- Sendungsnummer: {tracking}
- Sendung verfolgen: {trackingUrl}

Bei Problemen mit der Bestellung antworte einfach auf diese E-Mail.

{shop}`,
    },
    fr: {
      subject: "[{shop}] Votre commande a été expédiée ({order})",
      body: `Bonjour {name},

Merci pour votre commande chez {shop}. Votre colis est en route.

- Numéro de commande : {order}
- Article(s) : {product}
- Date d'expédition : {shipDate}
- Livraison estimée : {eta}
- Transporteur : {carrier}
- Numéro de suivi : {tracking}
- Suivre le colis : {trackingUrl}

En cas de problème avec votre commande, répondez simplement à cet e-mail.

{shop}`,
    },
    es: {
      subject: "[{shop}] Tu pedido ha sido enviado ({order})",
      body: `Hola {name}:

Gracias por comprar en {shop}. Tu pedido va en camino.

- Número de pedido: {order}
- Artículo(s): {product}
- Fecha de envío: {shipDate}
- Entrega estimada: {eta}
- Transportista: {carrier}
- Número de seguimiento: {tracking}
- Seguir el envío: {trackingUrl}

Si algo no está bien con tu pedido, responde a este correo.

{shop}`,
    },
  },

  // ── 発送遅延のお詫び ────────────────────────
  delay: {
    ja: {
      subject: "【{shop}】ご注文商品の発送遅延のお詫び（{order}）",
      body: `{name} 様

{shop} をご利用いただきありがとうございます。
ご注文 {order} の「{product}」につきまして、発送が遅れておりますことを深くお詫び申し上げます。

■ 遅延の理由：{reason}
■ 新しい発送予定：{nextEta}
■ お届け目安：{eta}

ご迷惑をおかけし誠に申し訳ございません。
キャンセルをご希望の場合は、このメールへご返信ください。速やかに対応いたします。

{shop}`,
    },
    en: {
      subject: "[{shop}] We're sorry — your order is delayed ({order})",
      body: `Dear {name},

Thank you for your order with {shop}. We're very sorry to let you know that "{product}" (order {order}) is delayed.

- Reason: {reason}
- New estimated ship date: {nextEta}
- Estimated delivery: {eta}

We sincerely apologize for the inconvenience. If you'd prefer to cancel, just reply to this email and we'll take care of it right away.

{shop}`,
    },
    zh: {
      subject: "【{shop}】订单发货延迟致歉（{order}）",
      body: `{name} 您好：

感谢您在 {shop} 下单。非常抱歉地通知您，订单 {order} 的「{product}」发货出现延迟。

- 延迟原因：{reason}
- 新的预计发货日：{nextEta}
- 预计送达：{eta}

给您带来不便，我们深表歉意。如需取消订单，请直接回复此邮件，我们会尽快处理。

{shop}`,
    },
    de: {
      subject: "[{shop}] Entschuldigung — deine Bestellung verzögert sich ({order})",
      body: `Hallo {name},

danke für deine Bestellung bei {shop}. Leider verzögert sich der Versand von „{product}" (Bestellung {order}).

- Grund: {reason}
- Neuer voraussichtlicher Versand: {nextEta}
- Voraussichtliche Lieferung: {eta}

Wir entschuldigen uns aufrichtig für die Unannehmlichkeiten. Wenn du stornieren möchtest, antworte einfach auf diese E-Mail.

{shop}`,
    },
    fr: {
      subject: "[{shop}] Toutes nos excuses — votre commande est retardée ({order})",
      body: `Bonjour {name},

Merci pour votre commande chez {shop}. Nous sommes navrés de vous informer que « {product} » (commande {order}) est retardé.

- Raison : {reason}
- Nouvelle date d'expédition estimée : {nextEta}
- Livraison estimée : {eta}

Nous vous prions de nous excuser pour la gêne occasionnée. Pour annuler, répondez simplement à cet e-mail.

{shop}`,
    },
    es: {
      subject: "[{shop}] Disculpa — tu pedido se ha retrasado ({order})",
      body: `Hola {name}:

Gracias por tu pedido en {shop}. Lamentamos informarte de que «{product}» (pedido {order}) se ha retrasado.

- Motivo: {reason}
- Nueva fecha estimada de envío: {nextEta}
- Entrega estimada: {eta}

Pedimos disculpas por las molestias. Si prefieres cancelar, responde a este correo y lo gestionamos de inmediato.

{shop}`,
    },
  },

  // ── 一部欠品・分割発送 ──────────────────────
  partial: {
    ja: {
      subject: "【{shop}】一部商品の分割発送のお知らせ（{order}）",
      body: `{name} 様

{shop} をご利用いただきありがとうございます。
ご注文 {order} のうち、在庫状況により一部を先行して発送いたします。

■ 本日発送分：{shippedItems}
　・配送業者：{carrier}
　・追跡番号：{tracking}
　・追跡：{trackingUrl}
　・お届け目安：{eta}

■ 次回発送分（欠品中）：{backorderItems}
　・発送予定：{nextEta}

分割による追加送料はいただきません。ご不明点はこのメールへご返信ください。

{shop}`,
    },
    en: {
      subject: "[{shop}] Partial shipment of your order ({order})",
      body: `Dear {name},

Thank you for your order with {shop}. Due to stock availability, we're shipping part of order {order} now and the rest to follow.

Shipped today: {shippedItems}
- Carrier: {carrier}
- Tracking number: {tracking}
- Track: {trackingUrl}
- Estimated delivery: {eta}

To follow (currently out of stock): {backorderItems}
- Estimated ship date: {nextEta}

There is no extra shipping charge for the split delivery. Reply to this email with any questions.

{shop}`,
    },
    zh: {
      subject: "【{shop}】订单分批发货通知（{order}）",
      body: `{name} 您好：

感谢您在 {shop} 下单。由于库存原因，订单 {order} 将分批发货。

本次发货：{shippedItems}
- 快递公司：{carrier}
- 运单号：{tracking}
- 物流查询：{trackingUrl}
- 预计送达：{eta}

后续发货（缺货中）：{backorderItems}
- 预计发货日：{nextEta}

分批发货不额外收取运费。如有疑问请回复此邮件。

{shop}`,
    },
    de: {
      subject: "[{shop}] Teillieferung deiner Bestellung ({order})",
      body: `Hallo {name},

danke für deine Bestellung bei {shop}. Aufgrund der Lagerverfügbarkeit versenden wir Bestellung {order} in zwei Teilen.

Heute versandt: {shippedItems}
- Versanddienstleister: {carrier}
- Sendungsnummer: {tracking}
- Verfolgen: {trackingUrl}
- Voraussichtliche Lieferung: {eta}

Folgt noch (derzeit nicht auf Lager): {backorderItems}
- Voraussichtlicher Versand: {nextEta}

Für die Teillieferung entstehen keine zusätzlichen Versandkosten. Bei Fragen antworte auf diese E-Mail.

{shop}`,
    },
    fr: {
      subject: "[{shop}] Expédition partielle de votre commande ({order})",
      body: `Bonjour {name},

Merci pour votre commande chez {shop}. En raison des stocks, nous expédions la commande {order} en deux fois.

Expédié aujourd'hui : {shippedItems}
- Transporteur : {carrier}
- Numéro de suivi : {tracking}
- Suivi : {trackingUrl}
- Livraison estimée : {eta}

À suivre (en rupture) : {backorderItems}
- Date d'expédition estimée : {nextEta}

Aucun frais de port supplémentaire pour cette livraison fractionnée. Pour toute question, répondez à cet e-mail.

{shop}`,
    },
    es: {
      subject: "[{shop}] Envío parcial de tu pedido ({order})",
      body: `Hola {name}:

Gracias por tu pedido en {shop}. Por disponibilidad de stock, enviamos el pedido {order} en dos partes.

Enviado hoy: {shippedItems}
- Transportista: {carrier}
- Número de seguimiento: {tracking}
- Seguimiento: {trackingUrl}
- Entrega estimada: {eta}

Pendiente (sin stock): {backorderItems}
- Fecha estimada de envío: {nextEta}

No hay cargo de envío adicional por la entrega dividida. Responde a este correo si tienes dudas.

{shop}`,
    },
  },

  // ── 海外発送 ────────────────────────────────
  overseas: {
    ja: {
      subject: "【{shop}】海外発送のご案内（{order}）",
      body: `{name} 様

{shop} をご利用いただきありがとうございます。
ご注文の商品を国際便で発送いたしました。

■ ご注文番号：{order}
■ 商品：{product}
■ 発送日：{shipDate}
■ 配送業者：{carrier}
■ 追跡番号：{tracking}
■ 追跡：{trackingUrl}
■ お届け目安：{eta}（通関状況により前後します）

※ 到着国での関税・輸入消費税が発生する場合があります。原則としてお受け取りのお客様のご負担となります。
※ 追跡は反映まで数日かかることがあります。

{shop}`,
    },
    en: {
      subject: "[{shop}] Your international shipment ({order})",
      body: `Dear {name},

Thank you for shopping with {shop}. Your order has been shipped internationally.

- Order number: {order}
- Item(s): {product}
- Shipped on: {shipDate}
- Carrier: {carrier}
- Tracking number: {tracking}
- Track: {trackingUrl}
- Estimated delivery: {eta} (may vary with customs clearance)

Note: Import duties and taxes may apply in the destination country and are generally the recipient's responsibility. Tracking may take a few days to update.

{shop}`,
    },
    zh: {
      subject: "【{shop}】国际发货通知（{order}）",
      body: `{name} 您好：

感谢您在 {shop} 购物，您的订单已通过国际物流发出。

- 订单编号：{order}
- 商品：{product}
- 发货日期：{shipDate}
- 物流公司：{carrier}
- 运单号：{tracking}
- 物流查询：{trackingUrl}
- 预计送达：{eta}（视清关情况可能有出入）

注意：目的地国家可能产生关税及进口税，通常由收件人承担。物流信息可能需要数日才会更新。

{shop}`,
    },
    de: {
      subject: "[{shop}] Deine internationale Sendung ({order})",
      body: `Hallo {name},

danke für deinen Einkauf bei {shop}. Deine Bestellung wurde international versandt.

- Bestellnummer: {order}
- Artikel: {product}
- Versanddatum: {shipDate}
- Versanddienstleister: {carrier}
- Sendungsnummer: {tracking}
- Verfolgen: {trackingUrl}
- Voraussichtliche Lieferung: {eta} (abhängig von der Zollabfertigung)

Hinweis: Im Zielland können Einfuhrzölle und -steuern anfallen; diese trägt in der Regel der Empfänger. Die Sendungsverfolgung kann einige Tage bis zur Aktualisierung brauchen.

{shop}`,
    },
    fr: {
      subject: "[{shop}] Votre envoi international ({order})",
      body: `Bonjour {name},

Merci pour votre achat chez {shop}. Votre commande a été expédiée à l'international.

- Numéro de commande : {order}
- Article(s) : {product}
- Date d'expédition : {shipDate}
- Transporteur : {carrier}
- Numéro de suivi : {tracking}
- Suivi : {trackingUrl}
- Livraison estimée : {eta} (variable selon le dédouanement)

Remarque : des droits et taxes d'importation peuvent s'appliquer dans le pays de destination et sont généralement à la charge du destinataire. Le suivi peut mettre quelques jours à s'actualiser.

{shop}`,
    },
    es: {
      subject: "[{shop}] Tu envío internacional ({order})",
      body: `Hola {name}:

Gracias por comprar en {shop}. Tu pedido ha sido enviado a nivel internacional.

- Número de pedido: {order}
- Artículo(s): {product}
- Fecha de envío: {shipDate}
- Transportista: {carrier}
- Número de seguimiento: {tracking}
- Seguimiento: {trackingUrl}
- Entrega estimada: {eta} (puede variar según la aduana)

Nota: pueden aplicarse aranceles e impuestos de importación en el país de destino, normalmente a cargo del destinatario. El seguimiento puede tardar unos días en actualizarse.

{shop}`,
    },
  },
};

export interface Carrier {
  id: string;
  label: string;
  /** {t} を追跡番号に置換 */
  url: string;
}

/**
 * 追跡番号を URL パラメータ（一部はパス）に載せると、開いた時点で検索済み状態になる形式。
 * 各社の仕様変更で動かなくなることがあるため、UI 側でプレビューを確認できるようにしている。
 * 検証: 2026-09。
 */
export const CARRIERS: Carrier[] = [
  { id: "yamato", label: "ヤマト運輸", url: "https://jizen.kuronekoyamato.co.jp/jizen/servlet/crjz.b.NQ0010?id={t}" },
  { id: "sagawa", label: "佐川急便", url: "https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo={t}" },
  { id: "jppost", label: "日本郵便（ゆうパック等）", url: "https://trackings.post.japanpost.jp/services/srv/search/direct?searchKind=S003&locale=ja&SVID=023&reqCodeNo1={t}" },
  { id: "seino", label: "西濃運輸", url: "https://track.seino.co.jp/cgi-bin/gnpquery.pgm?GNPNO1={t}" },
  { id: "fukuyama", label: "福山通運", url: "https://corp.fukutsu.co.jp/situation/tracking_no_hunt/{t}" },
  { id: "ems", label: "EMS / 国際郵便", url: "https://trackings.post.japanpost.jp/services/srv/search/direct?searchKind=S003&locale=ja&SVID=023&reqCodeNo1={t}" },
  { id: "dhl", label: "DHL Express", url: "https://www.dhl.com/en/express/tracking.html?AWB={t}" },
  { id: "fedex", label: "FedEx", url: "https://www.fedex.com/apps/fedextrack/?tracknumbers={t}" },
  { id: "ups", label: "UPS", url: "https://wwwapps.ups.com/WebTracking?TypeOfInquiryNumber=T&InquiryNumber1={t}" },
  { id: "other", label: "その他 / 手入力", url: "" },
];

export function trackingUrl(carrierId: string, tracking: string, manual: string): string {
  const c = CARRIERS.find((x) => x.id === carrierId);
  if (!c || !c.url) return manual;
  return c.url.replace("{t}", encodeURIComponent(tracking));
}

export function fillTemplate(tpl: string, f: ShipFields): string {
  return tpl
    .replaceAll("{shop}", f.shop || "")
    .replaceAll("{name}", f.name || "")
    .replaceAll("{order}", f.order || "")
    .replaceAll("{product}", f.product || "")
    .replaceAll("{carrier}", f.carrier || "")
    .replaceAll("{tracking}", f.tracking || "")
    .replaceAll("{trackingUrl}", f.trackingUrl || "")
    .replaceAll("{shipDate}", f.shipDate || "")
    .replaceAll("{eta}", f.eta || "")
    .replaceAll("{reason}", f.reason || "")
    .replaceAll("{nextEta}", f.nextEta || "")
    .replaceAll("{shippedItems}", f.shippedItems || "")
    .replaceAll("{backorderItems}", f.backorderItems || "");
}
