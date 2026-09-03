# 学ぶ（動画学習）チャンネル設定

`channels.json` に、取得対象の YouTube チャンネルを列挙します。

```jsonc
[
  {
    "id": "UCxxxxxxxxxxxxxxxxxxxxxx",   // YouTube チャンネルID（"UC" で始まる24文字）
    "name": "チャンネル名",              // 一覧に表示する名前
    "platform": "shopify",              // rakuten | amazon | yahoo | shopify | common
    "category": "集客・SEO",            // 構築・設定 | 集客・SEO | 転換・CRO | 業務効率化
    "relatedToolPath": "/tools/shopify-jsonld/"  // 関連ツール（任意。空文字で無し）
  }
]
```

## チャンネルIDの調べ方

- チャンネルページを開く → ページのソースで `"channelId":"UC..."` を検索
- または `https://www.youtube.com/@ハンドル` を開き、URL が `/channel/UC...` に変わるページ（登録/概要など）から取得

## 反映のしくみ

1. `.github/workflows/update-videos.yml` が毎日 03:00(JST) に `scripts/fetch-videos.mjs` を実行
2. 各チャンネルの RSS（`https://www.youtube.com/feeds/videos.xml?channel_id=<id>`）から最新動画を取得
3. `platform` / `category` / `relatedToolPath` を各動画に結合し、公開日の新しい順で
   `src/data/videos.json` に書き出し
4. 差分があれば commit & push → Pages の再ビルドが走り、`/learn` に反映

手動実行は GitHub の Actions タブ →「Update learn videos」→ Run workflow。
