"use client";

import { useI18n } from "@/lib/i18n";

/**
 * Chrome拡張連携ツールの MVP プレースホルダー。
 * 拡張機能（別リポジトリで配布予定）が未インストールの場合の説明と、
 * 手動貼り付けによるフォールバック入力口を提供する。
 */
export function ExtensionStub({
  how,
  children,
}: {
  how: string[];
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="card border-dashed p-4">
        <p className="font-semibold">⧉ {t("extensionRequired")}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          分散スクレイピング構造の要件により、データ収集はユーザーのブラウザ（Chrome拡張機能）から
          直接実行します。サーバー側のプロキシは使用しません。
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
          {how.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-[var(--muted)]">
          ※ 拡張機能パッケージ（<code>musou-ec-extension</code>）は現在準備中です。
        </p>
      </div>
      {children && (
        <div>
          <p className="mb-2 text-sm font-medium">手動フォールバック</p>
          {children}
        </div>
      )}
    </div>
  );
}
