/**
 * MUSOU-EC コネクタ — background service worker
 * content.js からのリクエストを受けて、拡張の権限でクロスオリジン fetch を行い結果を返す。
 */

const GOJUON = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("");
const ALPHA = "abcdefghijklmnopqrstuvwxyz".split("");

async function fetchText(url) {
  const res = await fetch(url, { credentials: "omit", headers: { "Accept": "*/*" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/** 楽天サジェスト（1キーワード）。エンドポイント仕様は変わりうるので複数試す。 */
async function rakutenSuggestOne(keyword) {
  const q = encodeURIComponent(keyword);
  const tryUrls = [
    `https://suggest.rakuten.co.jp/?q=${q}&format=json&count=10`,
    `https://suggest.rakuten.co.jp/?q=${q}&format=jsonp&count=10&callback=cb`,
  ];
  for (const url of tryUrls) {
    try {
      let body = await fetchText(url);
      // JSONP なら callback(...) を剥がす
      const m = body.match(/^\s*[\w$.]+\((.*)\)\s*;?\s*$/s);
      if (m) body = m[1];
      const json = JSON.parse(body);
      const out = extractSuggestStrings(json);
      if (out.length) return out;
    } catch (_e) {
      /* 次を試す */
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
      return { keywords: [...all].sort((a, b) => a.localeCompare(b, "ja")) };
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
