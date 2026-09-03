/**
 * MUSOU-EC コネクタ — background service worker
 * content.js からのリクエストを受けて、拡張の権限でクロスオリジン fetch を行い結果を返す。
 */

const GOJUON = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("");
const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");

async function fetchText(url) {
  const res = await fetch(url, { credentials: "omit", headers: { "Accept": "*/*" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // 楽天サジェストは oe 指定を無視して EUC-JP を返すことがあるので、
  // UTF-8 で読んで文字化け（U+FFFD）が出たら euc-jp で読み直す。
  const buf = await res.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buf);
  if (text.includes("�")) {
    try {
      text = new TextDecoder("euc-jp").decode(buf);
    } catch (_e) {
      /* euc-jp 非対応環境ならそのまま */
    }
  }
  return text;
}

let lastSuggestError = "";

/** 楽天サジェスト（1キーワード）。エンドポイント仕様は変わりうるので複数試す。 */
async function rakutenSuggestOne(keyword) {
  const q = encodeURIComponent(keyword);
  const cb = `jsonp${Date.now()}`;
  const tryUrls = [
    `https://api.suggest.search.rakuten.co.jp/suggest?cl=dir&rid=0&sid=0&q=${q}&oe=utf-8&sl=pm_swg&cb=${cb}`,
    `https://api.suggest.search.rakuten.co.jp/suggest?cl=dir&rid=0&sid=0&q=${q}&sl=pm_swg&cb=${cb}`,
    `https://suggest.rakuten.co.jp/?q=${q}&format=json&count=10`,
    `https://suggest.rakuten.co.jp/?q=${q}&format=jsonp&count=10&callback=cb`,
  ];
  for (const url of tryUrls) {
    try {
      let body = await fetchText(url);
      // JSONP なら callback(...) を剥がす
      const m = body.match(/^[^(]*\((.*)\)[\s;]*$/s);
      if (m) body = m[1];
      const json = JSON.parse(body.trim());
      const out = extractSuggestStrings(json);
      if (out.length) return out;
      lastSuggestError = "応答は取得できたが候補文字列が見つからない（形式変更の可能性）";
    } catch (e) {
      lastSuggestError = `${url.split("?")[0]} → ${(e && e.message) || e}`;
    }
  }
  return [];
}

/** 楽天サジェスト応答の形が複数ありうるので、文字列らしきものを拾う */
function extractSuggestStrings(json) {
  const acc = new Set();
  const walk = (v) => {
    if (typeof v === "string") {
      const s = v.trim();
      if (s && s.length <= 60) acc.add(s);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk);
    }
  };
  walk(json);
  return [...acc];
}

async function handle(req) {
  switch (req.type) {
    case "ping":
      return { pong: true, version: chrome.runtime.getManifest().version };

    case "fetchText": {
      const text = await fetchText(req.url);
      return { text };
    }

    case "rakutenSuggest": {
      // seed と、seed + 五十音/アルファベット の総当たりで深掘り
      const seed = String(req.seed || "").trim();
      if (!seed) return { keywords: [] };
      const mode = req.mode === "alpha" ? ALPHA : GOJUON;
      const probes = [seed, ...mode.map((x) => `${seed} ${x}`)];
      const all = new Set();
      // 直列（相手サーバーに優しく）
      for (const p of probes) {
        const got = await rakutenSuggestOne(p);
        got.forEach((k) => all.add(k));
        await new Promise((r) => setTimeout(r, 120));
      }
      const keywords = [...all].sort((a, b) => a.localeCompare(b, "ja"));
      return keywords.length
        ? { keywords }
        : { keywords: [], debug: lastSuggestError || "候補ゼロ（原因不明）" };
    }

    default:
      throw new Error(`unknown request type: ${req.type}`);
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.__musou !== "req") return;
  handle(msg.req)
    .then((data) => sendResponse({ __musou: "res", id: msg.id, ok: true, data }))
    .catch((err) => sendResponse({ __musou: "res", id: msg.id, ok: false, error: String(err && err.message || err) }));
  return true; // async
});
