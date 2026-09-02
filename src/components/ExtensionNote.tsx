/** 拡張連携ツールの共通バナー（拡張は準備中、手動フォールバックあり）。 */
export function ExtensionNote({ auto, manual }: { auto: string; manual: string }) {
  return (
    <div className="card border-dashed p-4 text-sm">
      <p className="font-semibold">⧉ Chrome拡張連携ツール</p>
      <p className="mt-1 text-[var(--muted)]">
        分散スクレイピング構造の要件により、データ収集はユーザーのブラウザ（拡張機能）から直接実行します。
        サーバー側プロキシは使いません。
      </p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[var(--muted)]">
        <li>
          <b className="text-[var(--foreground)]">拡張導入後：</b>
          {auto}
        </li>
        <li>
          <b className="text-[var(--foreground)]">現在（手動フォールバック）：</b>
          {manual}
        </li>
      </ul>
      <p className="mt-2 text-xs text-[var(--muted)]">
        ※ 拡張パッケージ（<code>musou-ec-extension</code>）は準備中です。
      </p>
    </div>
  );
}
