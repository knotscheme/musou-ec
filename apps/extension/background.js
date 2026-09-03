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

/** サジェスト候補エンドポイント（1キーワード分のURL一覧を組み立てる）
 *  現行は楽天の検索窓が使う autocomplete ゲートウェイ。rp トークンは無しでも通る想定で、
 *  必要なら req.rp（検索ページから取得したもの）を付与する。 */
function suggestUrls(keyword, rp) {
  const q = encodeURIComponent(keyword);
  const rpp = rp ? `&rp=${encodeURIComponent(rp)}` : "";
  return [
    `https://rdc-api-catalog-gateway-api.rakuten.co.jp/SUI/autocomplete/pc?q=${q}${rpp}&acc=1&aid=57`,
  ];
}

/** autocomplete 応答 { suggestions:[{name,type}], ... } から keyword 名だけ取り出す */
function parseSuggestBody(body) {
  let s = body.trim();
  const m = s.match(/^[^(]*\((.*)\)[\s;]*$/s); // 念のため JSONP 対応
  if (m) s = m[1];
  const json = JSON.parse(s);
  if (json && Array.isArray(json.suggestions)) {
    return json.suggestions
      .filter((it) => it && typeof it.name === "string" && (!it.type || it.type === "keyword"))
      .map((it) => it.name.trim())
      .filter(Boolean);
  }
  return extractSuggestStrings(json); // 形式が変わった時の保険
}

/** 楽天サジェスト（1キーワード）。 */
async function rakutenSuggestOne(keyword, rp) {
  const errs = [];
  for (const url of suggestUrls(keyword, rp)) {
    try {
      const body = await fetchText(url);
      const out = parseSuggestBody(body);
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
      // seed と、seed + 五十音/アルファベット の総当たりで深掘り。
      // ニッチ語だと1段では候補が少ないので、収穫が薄いときは2段目（1段目の結果をさらに展開）へ。
      const seed = String(req.seed || "").trim();
      if (!seed) return { keywords: [] };
      const rp = req.rp ? String(req.rp) : "";
      const suffix = req.mode === "alpha" ? ALPHA : GOJUON;
      const suffixLite = req.mode === "alpha" ? "abcdefghij".split("") : "あかさたなはまやらわ".split("");
      const all = new Set();
      let calls = 0;
      const MAX_CALLS = 400;

      async function sweep(base, sfx) {
        for (const x of sfx) {
          if (calls >= MAX_CALLS) return;
          calls++;
          const got = await rakutenSuggestOne(x ? `${base} ${x}` : base, rp);
          got.forEach((k) => all.add(k));
          await new Promise((r) => setTimeout(r, 70));
        }
      }

      // 1段目：seed 単体 + seed×全五十音/全アルファベット
      await sweep(seed, ["", ...suffix]);

      // 2段目：1段目で得た候補が薄いとき、上位の候補をさらに展開（軽い接尾辞セットで）
      const lvl1 = [...all].filter((k) => k !== seed && k.length <= 40).slice(0, 15);
      if (all.size < 40) {
        for (const base of lvl1) {
          if (calls >= MAX_CALLS) break;
          await sweep(base, suffixLite);
        }
      }

      const keywords = [...all].sort((a, b) => a.localeCompare(b, "ja"));
      return keywords.length
        ? { keywords, tried: calls }
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
