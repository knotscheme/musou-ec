/**
 * SEO関連(metadataBase・sitemap・robots)で使う、本番公開URLの組み立て。
 * GitHub Pagesのプロジェクトページ(knotscheme.github.io/musou-ec/)に固定でデプロイされる
 * ため、next.config.tsと同じPAGES_BASE_PATH(ビルド時環境変数)をそのまま使う。
 * ローカルではNEXT_PUBLIC_BASE_PATHが空になるが、metadataは常に本番URLを指すべきなので
 * (SNSシェア・検索結果に出るURLは本番のものでなければ意味がない)、
 * basePathだけは本番の既知の値にフォールバックする。
 */
const SITE_ORIGIN = "https://knotscheme.github.io";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "/musou-ec";

export function getSiteUrl(path = ""): string {
  const normalizedPath = path && !path.startsWith("/") ? `/${path}` : path;
  return `${SITE_ORIGIN}${BASE_PATH}${normalizedPath}`;
}

export const SITE_BASE_URL = getSiteUrl("/");
