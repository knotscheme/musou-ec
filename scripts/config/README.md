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

- チャンネルページを開く → ページのソース（右クリック→ページのソースを表示）で
  `"channelId":"UC` を検索してコピー
- または URL が `youtube.com/channel/UC...` になっているページ（他サイトからのリンク等）から

## ⚠ 取得には YouTube Data API キーが必要

`scripts/fetch-videos.mjs` は次の順で動きます。

1. 環境変数 `YT_API_KEY` があれば **YouTube Data API v3** で取得（確実）
2. 無ければ RSS フォールバック（`feeds/videos.xml`）→ **GitHub Actions の実行環境では
   YouTube 側にブロックされ 404 になるため実質使えない**

### API キーの作成と登録

1. Google Cloud Console → プロジェクト作成 →「YouTube Data API v3」を有効化
2. 「認証情報」→「APIキー」を作成（利用制限は YouTube Data API v3 のみに絞ると安全）
3. GitHub リポジトリ → Settings → Secrets and variables → Actions → New repository secret
   - Name: `YT_API_KEY`
   - Value: 作成したキー
4. Actions タブ →「Update learn videos」→ Run workflow で手動実行して確認

無料枠は 10,000 units/日。30チャンネルを1日1回取得しても数百 units 程度です。

## 反映のしくみ

1. `.github/workflows/update-videos.yml` が毎日 03:00(JST) に `scripts/fetch-videos.mjs` を実行
2. 各チャンネルの最新動画を取得し、`platform` / `category` / `relatedToolPath` を結合、
   公開日の新しい順で `src/data/videos.json` に書き出し
3. 差分があれば commit & push → Pages の再ビルドが走り `/learn` に反映
