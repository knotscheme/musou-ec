import type { NextConfig } from "next";

/**
 * ゼロコスト・アーキテクチャ要件:
 * - フロントエンドを静的エクスポートし GitHub Pages / Cloudflare Pages / Vercel へデプロイ
 * - サーバー処理を持たない（画像処理・CSV・スクレイピングは全てクライアント側）
 *
 * GitHub Pages のプロジェクトページ（knotscheme.github.io/musou-ec/）で配信するときは
 * ビルド時に PAGES_BASE_PATH=/musou-ec を渡す（Actions が設定）。ローカルは空でルート配信。
 */
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
