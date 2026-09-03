# MUSOU-EC コネクタ（Chrome拡張・MVP）

MUSOU-EC の「拡張連携ツール」を、ユーザーのブラウザから直接実行するための拡張機能。
サーバープロキシを持たないゼロコスト方針のため、クロスオリジンのデータ取得はこの拡張が担う。

## 審査は不要（開発者モードで読み込み）

Chrome Web Store に出さなくても使えます。

1. Chrome で `chrome://extensions` を開く
2. 右上の **デベロッパーモード** を ON
3. **「パッケージ化されていない拡張機能を読み込む」** → この `apps/extension` フォルダを選択
4. MUSOU-EC（https://knotscheme.github.io/musou-ec/ またはローカルの :3000）を開く
   → 拡張連携ツールに「拡張で自動取得」ボタンが出れば接続OK

更新したら `chrome://extensions` でこの拡張の «更新» を押す（自動更新はされません）。

## 仕組み

- `content.js` … MUSOU-EC のページ**のみ**で動き、`window.postMessage` と `chrome.runtime` を橋渡し。
  拡張IDをページ側に書かなくて済む relay 方式。
- `background.js` … 拡張の権限でクロスオリジン fetch。現状の対応リクエスト:
  - `ping` … 接続確認
  - `fetchText` … 指定URLの本文取得（`host_permissions` の範囲内）
  - `rakutenSuggest` … シード語＋五十音/アルファベット総当たりで楽天サジェストを深掘り
- `host_permissions` は楽天ドメインのみ（`suggest/search/www/item/ranking .rakuten.co.jp`）。
  検索順位計測・競合リサーチを実装する際に必要なドメインを追記する。

## Chrome Web Store に出す場合（任意・後日）

- 一度きりの登録料 $5、審査は通常数日
- 通りやすくするポイント：`host_permissions` を最小限に（今は楽天のみで良好）／単一目的を明記／
  リモートコードなし（MV3準拠・全てローカル）／各権限の用途説明を記入／
  「個人情報は収集しない」を宣言（この拡張は公開データ取得のみ・保存なし）
- 個人開発者でも問題なく公開可。
