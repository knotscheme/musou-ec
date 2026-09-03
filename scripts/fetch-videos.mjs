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
const PER_CHANNEL = 15;
const API_KEY = process.env.YT_API_KEY || "";

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

function withMeta(rows, ch, channelName) {
  return rows.map((v) => ({
    ...v,
    channelId: ch.id,
    channelName: channelName || ch.name || "",
    platform: PLATFORMS.includes(ch.platform) ? ch.platform : "common",
    category: ch.category || "",
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
  channels = (Array.isArray(channels) ? channels : []).filter(
    (c) => c && typeof c.id === "string" && /^UC[\w-]{20,}$/.test(c.id),
  );

  let all = [];
  if (channels.length === 0) {
    console.log("チャンネル未登録。");
  } else if (API_KEY) {
    console.log(`YouTube Data API で ${channels.length} チャンネル取得`);
    all = await fetchViaApi(channels);
  } else {
    console.log(`YT_API_KEY 未設定 → RSS で ${channels.length} チャンネル取得（環境により失敗あり）`);
    all = await fetchViaRss(channels);
  }

  const seen = new Set();
  const deduped = all.filter((v) => (seen.has(v.videoId) ? false : (seen.add(v.videoId), true)));
  deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(deduped, null, 2) + "\n", "utf8");
  console.log(`\n書き出し: ${OUT_PATH}（${deduped.length} 件）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
