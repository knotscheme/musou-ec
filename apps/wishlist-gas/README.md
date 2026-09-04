# アンケート集計（Google Apps Script → スプレッドシート）

MUSOU-EC の「あったらいいな」アンケート（`/wishlist/`）の投票・アイデア投稿を
1つのスプレッドシートに集める。完全無料・サーバー不要。

## 1. スプレッドシートと GAS を用意

1. [sheets.new](https://sheets.new) で新規スプレッドシートを作成（名前は「MUSOU-EC アンケート」など）
2. 上部メニュー **拡張機能 → Apps Script**
3. 開いたエディタの `コード.gs` を全消しして、この dir の [`Code.gs`](./Code.gs) の中身を貼り付け → 保存（💾）

> スタンドアロンで作った場合のみ：Apps Script の «プロジェクトの設定 → スクリプト プロパティ» に
> `SPREADSHEET_ID` = 対象シートのID（URL の `/d/` と `/edit` の間）を追加。
> 上記手順（シートから拡張機能で開く）ならこの設定は不要。

## 2. ウェブアプリとしてデプロイ

1. エディタ右上 **デプロイ → 新しいデプロイ**
2. 種類 **ウェブアプリ**
3. 設定：
   - 実行するユーザー：**自分**
   - アクセスできるユーザー：**全員**
4. **デプロイ** → 初回は Google アカウントの承認（「詳細 → (安全でないページ)へ移動」で許可）
5. 表示される **ウェブアプリの URL**（`https://script.google.com/macros/s/XXXX/exec`）をコピー

コードを直したときは **デプロイ → デプロイを管理 → 編集（鉛筆）→ バージョン「新バージョン」→ デプロイ**。
URL は変わらない。**Code.gs を更新したら必ずこの「新バージョン」デプロイをやり直すこと**
（やらないと古いコードのまま動く）。

> 送信は `doPost` に加え `doGet?...&kind=...` でも書けるようにしてある。
> ブラウザからの `/exec` への POST が 302 で GET に化けても取りこぼさないため。

## 3. MUSOU-EC 側に URL を登録

GitHub リポジトリ `knotscheme/musou-ec` の **Settings → Secrets and variables → Actions → New repository secret**

- Name: `WISHLIST_ENDPOINT`
- Secret: 手順2でコピーした `…/exec` の URL

`deploy.yml` がビルド時に `NEXT_PUBLIC_WISHLIST_ENDPOINT` として渡す。
次回デプロイ以降、投票・投稿が届くたびにスプレッドシートへ行追加される。

- `responses` シート … 全イベントの生ログ（vote の on/off も含む）
- `ideas` シート … アイデア投稿だけ抜き出したもの

> フロントは `no-cors` の撃ちっぱなしで送信するため、失敗しても画面には出ない
> （ローカル IndexedDB には常に保存される）。まず 1 票入れてシートに行が増えるか確認する。

## 4.（任意）集計を JSON で取り出す

`ADMIN_TOKEN` をスクリプトプロパティに設定すると、
`https://script.google.com/macros/s/XXXX/exec?token=<ADMIN_TOKEN>` で
`{ voteCounts, ideas }` が取れる（管理画面を作る場合用）。
