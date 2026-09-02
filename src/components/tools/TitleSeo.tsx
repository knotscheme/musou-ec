"use client";

import { Hub } from "@/components/tools/_hub";
import RakutenGenreKeyword from "@/components/tools/RakutenGenreKeyword";
import YahooNameSeo from "@/components/tools/YahooNameSeo";
import AmazonA9Keyword from "@/components/tools/AmazonA9Keyword";

export default function TitleSeo() {
  return (
    <Hub
      slug="title-seo"
      tabs={[
        { label: "楽天：ジャンル別KW最適化", hint: "商品名・キャッチ・PC用説明のKW配置を診断し最適ジャンルIDを提案。", Comp: RakutenGenreKeyword },
        { label: "Yahoo：商品名SEO", hint: "先頭キーワード・文字数・重複・記号・カテゴリ整合を採点。", Comp: YahooNameSeo },
        { label: "Amazon：A9キーワード", hint: "タイトル・検索キーワード欄(250byte)の重複・冗長・出現頻度を解析。", Comp: AmazonA9Keyword },
      ]}
    />
  );
}
