"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MALLS, MALL_ORDER, toolsByMall, getStatus } from "@/lib/malls";
import { ToolIcon } from "@/components/ToolIcon";
import { Glyph } from "@/components/Glyph";
import { StatusBadge, SaveButton } from "@/components/ToolMeta";
import { useI18n } from "@/lib/i18n";

export default function Dashboard() {
  const { t } = useI18n();
  const [activeMid, setActiveMid] = useState<string>(MALL_ORDER[0]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const threshold = 100; // 固定タブバーの少し下。ここを越えたセクションを「現在地」とする
      let current: string = MALL_ORDER[0];
      for (const mid of MALL_ORDER) {
        const el = document.getElementById(`mall-${mid}`);
        if (el && el.getBoundingClientRect().top <= threshold) current = mid;
      }
      setActiveMid((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const goTo = (mid: string) =>
    document.getElementById(`mall-${mid}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // 現在地のタブが常に見えるよう、タブ列を横スクロールで追従させる
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = stripRef.current;
    const btn = strip?.querySelector<HTMLElement>(`[data-mid="${activeMid}"]`);
    if (!strip || !btn) return;
    const left = btn.offsetLeft - strip.clientWidth / 2 + btn.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeMid]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">MUSOU-EC</h1>
        <p className="mt-1 text-[var(--muted)]">{t("appTagline")}</p>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          {t("zeroCostNote")} 画像処理・CSV解析・スクレイピングはすべてブラウザ内（Canvas /
          WebAssembly / Web Workers / Chrome拡張）で実行し、中央サーバーのコストをゼロに近づけています。
        </p>
      </header>

      {/* あったらいいな アンケート導線（目立つ場所） */}
      <Link
        href="/wishlist/"
        className="mb-6 flex flex-col gap-3 rounded-xl border p-4 transition hover:shadow-md sm:flex-row sm:items-center sm:gap-4"
        style={{ borderColor: "var(--brand)", background: "color-mix(in srgb, var(--brand) 10%, transparent)" }}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-white">
          <Glyph name="bulb" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-bold">「こんなツールが欲しい」を募集中</div>
          <p className="text-sm text-[var(--muted)]">
            開発中ツールへの投票・新しいアイデアの投稿はこちら。いただいた声を次の開発ネタにします。
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-[var(--brand)] px-3 py-2 text-center text-sm font-semibold text-white">
          アンケートへ
        </span>
      </Link>

      {/* モール別タブ（アンケートと楽天市場の間に配置。スクロールで上部に固定） */}
      <nav className="sticky top-0 z-20 mb-6 -mx-4 border-b bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] px-4 py-2 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:p-1.5 lg:top-2">
        <div
          ref={stripRef}
          className="flex gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {MALL_ORDER.map((mid) => {
            const mall = MALLS[mid];
            const on = activeMid === mid;
            return (
              <button
                key={mid}
                data-mid={mid}
                onClick={() => goTo(mid)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  on ? "text-white" : "bg-[var(--surface-soft)] text-[var(--foreground)]"
                }`}
                style={on ? { background: mall.color } : undefined}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: on ? "#fff" : mall.color }}
                />
                {mall.label}
              </button>
            );
          })}
        </div>
      </nav>

      {MALL_ORDER.map((mid) => {
        const mall = MALLS[mid];
        const tools = toolsByMall(mid);
        const liveCount = tools.filter((x) => getStatus(x) === "live").length;
        return (
          <section key={mid} id={`mall-${mid}`} className="mb-9 scroll-mt-24 lg:scroll-mt-20">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full" style={{ background: mall.color }} />
              <h2 className="text-lg font-bold" style={{ color: mall.color }}>
                {mall.label}
              </h2>
              <span className="text-xs text-[var(--muted)]">
                {tools.length}ツール（稼働中 {liveCount}）
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => {
                const status = getStatus(tool);
                const emph = tool.accent ?? mall.color;
                const cardCls = `card mall-bar flex flex-col gap-3 p-4 transition hover:shadow-md ${
                  tool.external ? "border-2" : ""
                }`;
                const cardStyle = tool.external
                  ? {
                      ["--mall" as string]: emph,
                      borderColor: emph,
                      background: `color-mix(in srgb, ${emph} 7%, transparent)`,
                    }
                  : { ["--mall" as string]: mall.color };
                const inner = (
                  <>
                    <div className="flex gap-3">
                      <ToolIcon name={tool.icon} color={emph} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-semibold leading-snug">
                            {tool.name}
                            {tool.external && (
                              <Glyph name="external" size={12} className="ml-1 inline align-baseline text-[var(--muted)]" />
                            )}
                          </span>
                          {!tool.external && <SaveButton slug={tool.slug} compact />}
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">{tool.summary}</p>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center gap-2">
                      <StatusBadge status={status} />
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]">
                        {tool.external ? (
                          <>
                            <Glyph name="external" size={12} /> 別サービス（新しいタブ）
                          </>
                        ) : (
                          <>
                            {tool.kind === "client" && t("kind_client")}
                            {tool.kind === "byok" && (
                              <>
                                <Glyph name="key" size={12} /> {t("kind_byok")}
                              </>
                            )}
                            {tool.kind === "extension" && (
                              <>
                                <Glyph name="layers" size={12} /> {t("kind_extension")}
                              </>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                  </>
                );
                return tool.external ? (
                  <a
                    key={tool.slug}
                    href={tool.external}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardCls}
                    style={cardStyle}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link key={tool.slug} href={`/tools/${tool.slug}/`} className={cardCls} style={cardStyle}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
