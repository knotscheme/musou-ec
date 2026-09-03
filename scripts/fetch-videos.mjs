/**
 * 学ぶ（動画学習）用データ生成スクリプト（ESM・依存パッケージなし）。
 *
 * scripts/config/channels.json の各チャンネルの最新動画を取得し、
 * 動画メタ（videoId / title / publishedAt / thumbnailUrl）に
 * platform / category / relatedToolPath を結合して
 * src/data/videos.json へ公開日の新しい順で書き出す。
 *
 * 取得方法:
 *   - 環境変数 YT_API_KEY があれば YouTube Data API v3 を使う（推奨・確実）。
 *   - 無ければ YouTube RSS（feeds/videos.xml）にフォールバック。
 *     ※ GitHub Actions など一部の環境では YouTube 側に RSS をブロックされ 404 になる。
 *       その場合は YT_API_KEY を GitHub Secrets に設定すること。
 *
 * Node 18+（グローバル fetch）前提。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHANNELS_PATH = path.join(ROOT, "scripts", "config", "channels.json");
const OUT_PATH = path.join(ROOT, "src", "data", "videos.json");

const PLATFORMS = ["rakuten", "amazon", "yahoo", "shopify", "common"];
const PER_CHANNEL = 20;
const API_KEY = process.env.YT_API_KEY || "";
/** これより前に公開された動画は除外（EC情報は古いと使えないため）。MIN_PUBLISHED で上書き可。 */
const MIN_PUBLISHED = process.env.MIN_PUBLISHED || "2025-01-01";
/** ラジオ／毎日配信の連番回・ライブ配信・切り抜き等は学習向きでないので除外 */
const EXCLUDE_TITLE = /ラジオ|ﾗｼﾞｵ|\bradio\b|生配信|ライブ配信|LIVE配信|ライブ配信中|アーカイブ配信|ポッドキャスト|podcast|切り抜き|^#\s?\d{2,4}[\s　]/i;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s) {
  return String(s || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/* ---------- YouTube Data API v3 ---------- */

async function api(pathname, params) {
  const usp = new URLSearchParams({ ...params, key: API_KEY });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${pathname}?${usp}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json;
}

/**
 * id が無い（handle / query しか無い）エントリを、Data API でチャンネルIDに解決する。
 * - handle: "@xxx" → channels.list(forHandle)（1 unit・確実）
 * - query : チャンネル名 → search(type=channel)（100 units・あいまい一致）
 */
async function resolveIds(channels) {
  const resolved = [];
  for (const c of channels) {
    if (typeof c.id === "string" && /^UC[\w-]{20,}$/.test(c.id)) {
      resolved.push(c);
      continue;
    }
    if (!API_KEY) {
      console.warn(`SKIP ${c.name || c.query || c.handle || "?"}: id未指定 & APIキー無し`);
      continue;
    }
    const label = c.handle || c.video || c.query;
    try {
      let id;
      let resolvedName;
      if (c.handle) {
        const j = await api("channels", { part: "id", forHandle: String(c.handle).replace(/^@/, "") });
        id = j.items?.[0]?.id;
      } else if (c.video) {
        // 動画IDから、その投稿チャンネルを特定する
        const j = await api("videos", { part: "snippet", id: c.video });
        id = j.items?.[0]?.snippet?.channelId;
        resolvedName = j.items?.[0]?.snippet?.channelTitle;
      } else if (c.query) {
        const j = await api("search", { part: "snippet", type: "channel", q: c.query, maxResults: "1" });
        id = j.items?.[0]?.id?.channelId;
        resolvedName = j.items?.[0]?.snippet?.channelTitle;
      }
      if (id) {
        console.log(`RESOLVE ${label} -> ${id}${resolvedName ? ` (${resolvedName})` : ""}`);
        resolved.push({ ...c, id, name: c.name || resolvedName || "" });
      } else {
        console.warn(`SKIP ${label}: チャンネルを解決できませんでした`);
      }
    } catch (err) {
      console.warn(`SKIP ${label}: ${err.message}`);
    }
  }
  return resolved;
}

async function fetchViaApi(channels) {
  const out = [];
  // まとめて uploads プレイリストIDを取得（1リクエスト50件まで）
  const meta = new Map();
  for (let i = 0; i < channels.length; i += 50) {
    const batch = channels.slice(i, i + 50);
    const j = await api("channels", {
      part: "contentDetails,snippet",
      id: batch.map((c) => c.id).join(","),
      maxResults: "50",
    });
    for (const item of j.items || []) {
      meta.set(item.id, {
        uploads: item.contentDetails?.relatedPlaylists?.uploads,
        title: item.snippet?.title || "",
      });
    }
  }

  for (const ch of channels) {
    const m = meta.get(ch.id);
    if (!m?.uploads) {
      console.warn(`SKIP ${ch.name || ch.id}: チャンネルが見つかりません`);
      continue;
    }
    try {
      const j = await api("playlistItems", {
        part: "snippet,contentDetails",
        playlistId: m.uploads,
        maxResults: String(PER_CHANNEL),
      });
      const rows = (j.items || [])
        .map((it) => {
          const videoId = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId;
          if (!videoId) return null;
          return {
            videoId,
            title: it.snippet?.title || "",
            publishedAt: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || "",
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          };
        })
        .filter(Boolean);
      console.log(`OK   ${m.title || ch.name || ch.id}: ${rows.length} 件`);
      out.push(...withMeta(rows, ch, m.title));
    } catch (err) {
      console.warn(`SKIP ${ch.name || ch.id}: ${err.message}`);
    }
  }
  return out;
}

/* ---------- RSS フォールバック ---------- */

function pick(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1].trim()) : "";
}

function parseFeed(xml) {
  const out = [];
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  for (const e of entries) {
    const videoId = pick(e, "yt:videoId");
    if (!videoId) continue;
    out.push({
      videoId,
      title: pick(e, "title"),
      publishedAt: pick(e, "published"),
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    });
  }
  return out;
}

async function fetchViaRss(channels) {
  const out = [];
  for (const ch of channels) {
    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(ch.id)}`;
      const res = await fetch(url, { headers: { "user-agent": UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = parseFeed(await res.text()).slice(0, PER_CHANNEL);
      console.log(`OK   ${ch.name || ch.id}: ${rows.length} 件`);
      out.push(...withMeta(rows, ch, ch.name));
    } catch (err) {
      console.warn(`SKIP ${ch.name || ch.id}: ${err.message}`);
    }
  }
  return out;
}

/* ---------- 共通 ---------- */

// タイトルからプラットフォーム／目的カテゴリを推定（当たらなければチャンネル既定値）
const PLAT_RULES = [
  ["rakuten", /楽天|rakuten|\bRPP\b|R-?SNS|\bRMS\b|スーパーSALE|お買い物マラソン|楽天GOLD|クーポンアドバンス|RaCoupon|ラクマ/i],
  ["yahoo", /ヤフー|yahoo|paypay|ペイペイ|アイテムマッチ|アイテムリーチ|ストアクリエイター|\bLYP\b|優良配送|ゾロ目の日|5のつく日/i],
  ["amazon", /amazon|アマゾン|\bFBA\b|セラーセントラル|\bACoS\b|\bTACoS\b|スポンサープロダクト|\bA9\b|Amazon広告|プライムデー|大口出品|ブランド登録/i],
  ["shopify", /shopify|ショッピファイ|\bliquid\b|セクション|ノーコード.*(ストア|EC)|Shopifyアプリ/i],
];
const CAT_RULES = [
  ["集客・SEO", /SEO|検索対策|検索順位|広告|集客|RPP|アイテムマッチ|流入|キーワード|Instagram|SNS|MEO|アクセス数|露出/i],
  ["転換・CRO", /CVR|コンバージョン|転換率|商品ページ|LP|ランディング|レビュー|接客|カゴ落ち|購入率|ファーストビュー|回遊|離脱/i],
  ["構築・設定", /構築|開店|出店|初期設定|テーマ|デザイン|ページ作成|楽天GOLD|liquid|登録方法|始め方|作り方|セットアップ/i],
  ["業務効率化", /CSV|一括|効率化|自動化|在庫|受注|発送|仕入れ|ツール活用|時短|オペレーション/i],
];
function detectBy(rules, title, fallback) {
  const t = title || "";
  for (const [val, re] of rules) if (re.test(t)) return val;
  return fallback;
}

function withMeta(rows, ch, channelName) {
  const chPlat = PLATFORMS.includes(ch.platform) ? ch.platform : "common";
  return rows.map((v) => ({
    ...v,
    channelId: ch.id,
    channelName: channelName || ch.name || "",
    platform: detectBy(PLAT_RULES, v.title, chPlat),
    category: detectBy(CAT_RULES, v.title, ch.category || ""),
    relatedToolPath: ch.relatedToolPath || "",
  }));
}

async function main() {
  let channels = [];
  try {
    channels = JSON.parse(fs.readFileSync(CHANNELS_PATH, "utf8"));
  } catch (err) {
    console.error("channels.json を読めませんでした:", err.message);
  }
  const entries = (Array.isArray(channels) ? channels : []).filter(
    (c) => c && (c.id || c.handle || c.query || c.video),
  );

  let all = [];
  if (entries.length === 0) {
    console.log("チャンネル未登録。");
  } else if (API_KEY) {
    const resolved = await resolveIds(entries);
    // 重複IDを排除
    const uniq = [];
    const idset = new Set();
    for (const c of resolved) {
      if (idset.has(c.id)) continue;
      idset.add(c.id);
      uniq.push(c);
    }
    console.log(`YouTube Data API で ${uniq.length} チャンネル取得`);
    all = await fetchViaApi(uniq);
  } else {
    const idOnly = entries.filter((c) => typeof c.id === "string" && /^UC[\w-]{20,}$/.test(c.id));
    console.log(`YT_API_KEY 未設定 → RSS で ${idOnly.length} チャンネル取得（環境により失敗あり）`);
    all = await fetchViaRss(idOnly);
  }

  const minTs = new Date(MIN_PUBLISHED).getTime();
  const seen = new Set();
  let excludedTitle = 0;
  const deduped = all.filter((v) => {
    if (seen.has(v.videoId)) return false;
    seen.add(v.videoId);
    const ts = new Date(v.publishedAt).getTime();
    if (Number.isNaN(ts) || ts < minTs) return false;
    if (EXCLUDE_TITLE.test(v.title || "")) {
      excludedTitle++;
      return false;
    }
    return true;
  });
  console.log(`フィルタ後: ${MIN_PUBLISHED} 以降 & ラジオ等除外(${excludedTitle}件) → ${deduped.length} 件`);

  // 再生回数（統計）をまとめて取得（videos.list は 50件/リクエスト・1 unit）
  if (API_KEY && deduped.length) {
    try {
      for (let i = 0; i < deduped.length; i += 50) {
        const batch = deduped.slice(i, i + 50);
        const j = await api("videos", {
          part: "statistics",
          id: batch.map((v) => v.videoId).join(","),
          maxResults: "50",
        });
        const stat = new Map((j.items || []).map((it) => [it.id, Number(it.statistics?.viewCount) || 0]));
        for (const v of batch) v.viewCount = stat.get(v.videoId) ?? 0;
      }
    } catch (err) {
      console.warn(`統計取得スキップ: ${err.message}`);
    }
  }
  for (const v of deduped) if (typeof v.viewCount !== "number") v.viewCount = 0;

  deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(deduped, null, 2) + "\n", "utf8");
  console.log(`\n書き出し: ${OUT_PATH}（${deduped.length} 件）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
