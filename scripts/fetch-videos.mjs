/**
 * 学ぶ（動画学習）用データ生成スクリプト（依存パッケージなし・ESM）。
 *
 * scripts/config/channels.json の各チャンネルの YouTube RSS を取得し、
 * 動画メタ（videoId / title / publishedAt / thumbnailUrl）に
 * platform / category / relatedToolPath を結合して
 * src/data/videos.json へ公開日の新しい順で書き出す。
 *
 * Node 18+（グローバル fetch）を前提。GitHub Actions から実行。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CHANNELS_PATH = path.join(ROOT, "scripts", "config", "channels.json");
const OUT_PATH = path.join(ROOT, "src", "data", "videos.json");

const PLATFORMS = ["rakuten", "amazon", "yahoo", "shopify", "common"];

function decodeEntities(s) {
  return String(s || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function pick(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1].trim()) : "";
}

/** YouTube feed XML → 動画メタ配列（依存なしの簡易パーサ） */
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

async function fetchChannel(ch) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(ch.id)}`;
  const res = await fetch(url, { headers: { "user-agent": "musou-ec-learn/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return parseFeed(xml).map((v) => ({
    ...v,
    channelId: ch.id,
    channelName: ch.name || "",
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

  const all = [];
  for (const ch of channels) {
    try {
      const rows = await fetchChannel(ch);
      console.log(`OK   ${ch.name || ch.id}: ${rows.length} 件`);
      all.push(...rows);
    } catch (err) {
      console.warn(`SKIP ${ch.name || ch.id}: ${err.message}`); // 1チャンネル失敗しても止めない
    }
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
