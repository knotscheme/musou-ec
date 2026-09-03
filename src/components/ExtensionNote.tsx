/** 拡張連携ツールの共通バナー。connected=true なら「接続中」表示、false なら手動フォールバック案内。 */
export function ExtensionNote({
  auto,
  manual,
  connected = false,
}: {
  auto: string;
  manual: string;
  connected?: boolean;
}) {
  if (connected) {
    return (
      <div className="card border-[var(--brand)] p-4 text-sm">
        <p className="font-semibold text-[var(--brand)]">⧉ MUSOU-EC コネクタ 接続中</p>
        <p className="mt-1 text-[var(--muted)]">{auto}</p>
      </div>
    );
  }
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
        ※ Chrome拡張「MUSOU-EC コネクタ」（<code>apps/extension</code>）を開発者モードで読み込むと自動取得が有効になります。
      </p>
    </div>
  );
}
