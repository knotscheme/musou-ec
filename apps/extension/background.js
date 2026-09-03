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

/** サジェスト候補エンドポイント（1キーワード分のURL一覧を組み立てる） */
function suggestUrls(keyword) {
  const q = encodeURIComponent(keyword);
  const cb = `jsonp${Date.now()}`;
  return [
    `https://api.suggest.search.rakuten.co.jp/suggest?cl=dir&rid=0&sid=0&q=${q}&oe=UTF-8&sl=pm_swg&cb=${cb}`,
    `https://suggest.search.rakuten.co.jp/suggest?cl=dir&rid=0&sid=0&q=${q}&oe=UTF-8&sl=pm_swg&cb=${cb}`,
    `https://search.rakuten.co.jp/suggest?q=${q}`,
    `https://suggest.rakuten.co.jp/?q=${q}&format=json&count=10`,
  ];
}

/** 楽天サジェスト（1キーワード）。エンドポイント仕様は変わりうるので複数試す。 */
async function rakutenSuggestOne(keyword) {
  const errs = [];
  for (const url of suggestUrls(keyword)) {
    try {
      let body = await fetchText(url);
      // JSONP なら callback(...) を剥がす
      const m = body.match(/^[^(]*\((.*)\)[\s;]*$/s);
      if (m) body = m[1];
      const json = JSON.parse(body.trim());
      const out = extractSuggestStrings(json);
      if (out.length) return out;
      errs.push(`${url.split("?")[0]} → 応答OKだが候補ゼロ`);
    } catch (e) {
      errs.push(`${url.split("?")[0]} → ${(e && e.message) || e}`);
    }
  }
  lastSuggestError = errs.join(" ／ ");
  return [];
}

/** 各候補URLを順に叩いて生の結果（status/先頭240字）を返す診断用 */
async function probeUrl(url) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { credentials: "omit", headers: { Accept: "*/*" } });
    const buf = await res.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) {
      try {
        text = new TextDecoder("euc-jp").decode(buf);
      } catch (_e) {
        /* noop */
      }
    }
    return { url, ok: res.ok, status: res.status, ms: Date.now() - t0, len: text.length, head: text.slice(0, 240) };
  } catch (e) {
    return { url, ok: false, status: 0, ms: Date.now() - t0, error: String((e && e.message) || e) };
  }
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

    case "rakutenSuggestProbe": {
      const seed = String(req.seed || "キャンプ").trim() || "キャンプ";
      const results = [];
      for (const u of suggestUrls(seed)) results.push(await probeUrl(u));
      return { results };
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
