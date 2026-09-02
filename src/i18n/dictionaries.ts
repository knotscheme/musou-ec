/**
 * 多言語対応。Shopify が普及している主要6ヶ国語:
 * 日本語 / 英語 / 中国語(簡体) / ドイツ語 / フランス語 / スペイン語。
 * シェル・ナビ・共通UIの文言のみを対象とする（各ツールの入力ラベルは別途）。
 */

export const LOCALES = ["ja", "en", "zh", "de", "fr", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABEL: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  zh: "简体中文",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

type Dict = {
  appTagline: string;
  nav_dashboard: string;
  nav_settings: string;
  nav_history: string;
  section_tools: string;
  kind_client: string;
  kind_byok: string;
  kind_extension: string;
  chat_title: string;
  chat_placeholder: string;
  chat_send: string;
  chat_empty: string;
  chat_guestNote: string;
  chat_needKey: string;
  openTool: string;
  extensionRequired: string;
  byokRequired: string;
  zeroCostNote: string;
};

export const DICT: Record<Locale, Dict> = {
  ja: {
    appTagline: "完全無料・ゼロコストのEC統合サポート",
    nav_dashboard: "ダッシュボード",
    nav_settings: "設定",
    nav_history: "実行履歴",
    section_tools: "ツール",
    kind_client: "ブラウザ内処理",
    kind_byok: "APIキー必要",
    kind_extension: "拡張機能連携",
    chat_title: "AIアシスタント",
    chat_placeholder: "質問を入力…",
    chat_send: "送信",
    chat_empty: "MUSOU-EC の使い方やEC運営の相談をどうぞ。",
    chat_guestNote: "ゲスト利用中。会員登録するとこの履歴が引き継がれます。",
    chat_needKey: "設定画面で Gemini API キーを登録すると AI 応答が使えます。",
    openTool: "ツールを開く",
    extensionRequired: "このツールは Chrome 拡張機能が必要です",
    byokRequired: "このツールは API キー（BYOK）が必要です",
    zeroCostNote: "処理はすべてあなたのブラウザ内で完結します。データは外部送信されません。",
  },
  en: {
    appTagline: "Free, zero-cost integrated e-commerce support",
    nav_dashboard: "Dashboard",
    nav_settings: "Settings",
    nav_history: "History",
    section_tools: "Tools",
    kind_client: "In-browser",
    kind_byok: "API key required",
    kind_extension: "Extension required",
    chat_title: "AI assistant",
    chat_placeholder: "Type your question…",
    chat_send: "Send",
    chat_empty: "Ask about using MUSOU-EC or e-commerce operations.",
    chat_guestNote: "Using as guest. Sign up to keep this chat history.",
    chat_needKey: "Add your Gemini API key in Settings to enable AI replies.",
    openTool: "Open tool",
    extensionRequired: "This tool requires the Chrome extension",
    byokRequired: "This tool requires an API key (BYOK)",
    zeroCostNote: "Everything runs in your browser. No data leaves your device.",
  },
  zh: {
    appTagline: "完全免费、零成本的电商一体化支持",
    nav_dashboard: "仪表板",
    nav_settings: "设置",
    nav_history: "运行记录",
    section_tools: "工具",
    kind_client: "浏览器内处理",
    kind_byok: "需要 API 密钥",
    kind_extension: "需要扩展程序",
    chat_title: "AI 助手",
    chat_placeholder: "输入你的问题…",
    chat_send: "发送",
    chat_empty: "欢迎咨询 MUSOU-EC 的使用方法或电商运营问题。",
    chat_guestNote: "正在以访客身份使用。注册后可保留此聊天记录。",
    chat_needKey: "在设置中添加 Gemini API 密钥即可启用 AI 回复。",
    openTool: "打开工具",
    extensionRequired: "此工具需要 Chrome 扩展程序",
    byokRequired: "此工具需要 API 密钥（BYOK）",
    zeroCostNote: "所有处理都在你的浏览器中完成，数据不会外发。",
  },
  de: {
    appTagline: "Kostenlose, kostenneutrale E-Commerce-Unterstützung",
    nav_dashboard: "Übersicht",
    nav_settings: "Einstellungen",
    nav_history: "Verlauf",
    section_tools: "Werkzeuge",
    kind_client: "Im Browser",
    kind_byok: "API-Schlüssel nötig",
    kind_extension: "Erweiterung nötig",
    chat_title: "KI-Assistent",
    chat_placeholder: "Frage eingeben…",
    chat_send: "Senden",
    chat_empty: "Fragen Sie zu MUSOU-EC oder zum E-Commerce-Betrieb.",
    chat_guestNote: "Als Gast unterwegs. Nach Registrierung bleibt der Verlauf erhalten.",
    chat_needKey: "Gemini-API-Schlüssel in den Einstellungen hinterlegen, um KI-Antworten zu nutzen.",
    openTool: "Werkzeug öffnen",
    extensionRequired: "Dieses Werkzeug benötigt die Chrome-Erweiterung",
    byokRequired: "Dieses Werkzeug benötigt einen API-Schlüssel (BYOK)",
    zeroCostNote: "Alles läuft in Ihrem Browser. Keine Daten verlassen Ihr Gerät.",
  },
  fr: {
    appTagline: "Support e-commerce intégré, gratuit et sans coût",
    nav_dashboard: "Tableau de bord",
    nav_settings: "Paramètres",
    nav_history: "Historique",
    section_tools: "Outils",
    kind_client: "Dans le navigateur",
    kind_byok: "Clé API requise",
    kind_extension: "Extension requise",
    chat_title: "Assistant IA",
    chat_placeholder: "Saisissez votre question…",
    chat_send: "Envoyer",
    chat_empty: "Posez vos questions sur MUSOU-EC ou la gestion e-commerce.",
    chat_guestNote: "Utilisation en invité. Créez un compte pour conserver cet historique.",
    chat_needKey: "Ajoutez votre clé API Gemini dans les paramètres pour activer les réponses IA.",
    openTool: "Ouvrir l'outil",
    extensionRequired: "Cet outil nécessite l'extension Chrome",
    byokRequired: "Cet outil nécessite une clé API (BYOK)",
    zeroCostNote: "Tout s'exécute dans votre navigateur. Aucune donnée ne quitte votre appareil.",
  },
  es: {
    appTagline: "Soporte integral de e-commerce, gratuito y sin coste",
    nav_dashboard: "Panel",
    nav_settings: "Ajustes",
    nav_history: "Historial",
    section_tools: "Herramientas",
    kind_client: "En el navegador",
    kind_byok: "Requiere clave API",
    kind_extension: "Requiere extensión",
    chat_title: "Asistente IA",
    chat_placeholder: "Escribe tu pregunta…",
    chat_send: "Enviar",
    chat_empty: "Consulta sobre el uso de MUSOU-EC o la operación de e-commerce.",
    chat_guestNote: "Uso como invitado. Regístrate para conservar este historial.",
    chat_needKey: "Añade tu clave API de Gemini en Ajustes para habilitar respuestas de IA.",
    openTool: "Abrir herramienta",
    extensionRequired: "Esta herramienta requiere la extensión de Chrome",
    byokRequired: "Esta herramienta requiere una clave API (BYOK)",
    zeroCostNote: "Todo se ejecuta en tu navegador. Ningún dato sale de tu dispositivo.",
  },
};
