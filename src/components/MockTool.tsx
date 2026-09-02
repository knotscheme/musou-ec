"use client";

import Link from "next/link";
import { getTool, getStatus, MALLS, KIND_LABEL } from "@/lib/malls";
import { ToolIcon } from "@/components/ToolIcon";
import { StatusBadge, SaveButton } from "@/components/ToolMeta";
import { useI18n } from "@/lib/i18n";

/**
 * MVP デザイン確認用のモックツール画面。
 * 実処理は未実装。レイアウト・カラーリング・アイコン・導線の確認が目的。
 */
export function MockTool({ slug }: { slug: string }) {
  const { t } = useI18n();
  const tool = getTool(slug);
  if (!tool) return <p>Unknown tool</p>;
  const mall = MALLS[tool.mall];
  const status = getStatus(tool);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 text-xs text-[var(--muted)]">
        <Link href="/" className="hover:underline">
          ダッシュボード
        </Link>{" "}
        / <span style={{ color: mall.color }}>{mall.label}</span>
      </div>

      <div
        className="mall-bar flex items-start gap-4 pl-4"
        style={{ ["--mall" as string]: mall.color }}
      >
        <ToolIcon name={tool.icon} color={mall.color} size={52} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{tool.name}</h1>
            <StatusBadge status={status} />
            <SaveButton slug={tool.slug} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">{tool.summary}</p>
          <span
            className="mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: mall.colorSoft, color: mall.color }}
          >
            {KIND_LABEL[tool.kind]}
          </span>
        </div>
      </div>

      {status === "wip" ? (
        <div className="mt-6 card p-5">
          <span className="rounded bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted)]">
            MOCK
          </span>
          <p className="mt-3 text-sm text-[var(--muted)]">
            この画面はデザイン確認用のモックです。ロジックは今後実装します。
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <span className="mb-1 block text-sm font-medium">入力</span>
              <div className="h-24 rounded-md border border-dashed bg-[var(--surface-soft)]" />
            </div>
            <button
              className="rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ background: mall.color }}
              disabled
            >
              実行（モック）
            </button>
            <div>
              <span className="mb-1 block text-sm font-medium">結果</span>
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card p-3">
                    <div className="text-xs text-[var(--muted)]">指標 {i + 1}</div>
                    <div className="mt-0.5 text-lg font-bold">—</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs text-[var(--muted)]">{t("zeroCostNote")}</p>
        </div>
      ) : (
        <div className="mt-6 card p-5 text-sm text-[var(--muted)]">
          実装コンポーネント未接続。<code>src/app/tools/{slug}/page.tsx</code> を追加してください。
        </div>
      )}

      {status === "wip" && (
        <p className="mt-4 text-xs text-[var(--muted)]">
          このツールは開発中です。優先度の投票・要望は
          <Link href="/wishlist/" className="mx-1 text-[var(--brand)] underline">
            あったらいいな
          </Link>
          から。
        </p>
      )}
    </div>
  );
}
