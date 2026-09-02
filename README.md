# MUSOU-EC

楽天市場・Yahoo!ショッピング・Amazon・自社サイト（Shopify等）を運営するEC事業者向けの、
**完全無料**の統合サポートプラットフォーム。従来のEC支援SaaSが抱えるインフラ維持費を、
クライアントサイドへの処理分散（オフロード）で解決し、運営側サーバーコストをゼロに近づける。

## 構成

- Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS v4
- **静的エクスポート**（`output: "export"`）→ Cloudflare Pages / Vercel へ配信。バックエンドなし。
- 状態・履歴: **IndexedDB**（`src/lib/idb.ts`）／ 設定・仮ID: **localStorage**
- AI: **BYOK**（ユーザーの Gemini API キーをブラウザから直接使用。`src/lib/byok.ts`）

## ゼロコスト・アーキテクチャ

| 要件 | 実装箇所 |
| --- | --- |
| クライアントサイド処理の徹底（画像・CSV） | `src/lib/csv.ts`、各ツール（Canvas） |
| 分散スクレイピング構造（Chrome拡張） | `src/components/ExtensionStub.tsx`（拡張は別パッケージ予定） |
| ストレージの分散化（IndexedDB） | `src/lib/idb.ts`、`src/lib/history.ts` |
| BYOK / オンデバイスAI | `src/lib/byok.ts`、設定画面 |
| フルサーバーレス & Jamstack | `next.config.ts` の静的エクスポート |

## UI/UX

- モール別カラーリング: 楽天=レッド / Yahoo=ブルー / Amazon=オレンジ / Shopify=グリーン（`src/lib/malls.ts`、`globals.css`）
- 固定サイドナビ（モール別アコーディオン）: `src/components/Sidebar.tsx`
- 画面右上に常設 AI チャットボット: `src/components/ChatWidget.tsx`
  - ゲスト利用時は localStorage に仮ID発行。会員紐付け時に IndexedDB の履歴 owner を移送（`src/lib/guest.ts` `linkGuestToMember()`）
- 多言語対応 6言語（ja / en / zh / de / fr / es）: `src/i18n/dictionaries.ts`、`src/lib/i18n.tsx`

## セットアップ

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # out/ に静的サイトを生成
```

## 現在の状態（MVP）

- サイトシェル（ナビ・カラーリング・チャット・多言語・設定）: 実装済み
- ツール: 楽天9 / Yahoo9 / Amazon9 / Shopify9 / 共通15。すべて `status: "wip"`（開発中）の
  **デザイン確認用モック**（`src/components/MockTool.tsx` + `src/app/tools/[slug]/`）
- 実装が済んだツールは `src/lib/malls.ts` で `status: "live"` を付け、`src/app/tools/<slug>/page.tsx` を追加すると
  モックからそのコンポーネントに切り替わる
- **「あったらいいな」アンケート**（`/wishlist`、`src/lib/wishlist.ts`）: 開発中ツールへの投票と
  アイデア投稿を収集。既定は IndexedDB 保存、`NEXT_PUBLIC_WISHLIST_ENDPOINT` 設定で集計先へ POST
- ツールカードとサイドバーに **稼働中 / 開発中** バッジ・ドットを表示
