"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MALLS, MALL_ORDER, toolsByMall, getStatus, STATUS_COLOR, type MallId } from "@/lib/malls";
import { ToolIcon } from "@/components/ToolIcon";
import { Glyph } from "@/components/Glyph";
import { useI18n } from "@/lib/i18n";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState<Record<MallId, boolean>>({
    rakuten: true,
    yahoo: false,
    amazon: false,
    shopify: false,
    common: false,
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // 開閉状態をこの端末に保存し、次回以降も復元する
  const OPEN_KEY = "musou.sidebar.open";
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(OPEN_KEY) || "null");
      if (saved && typeof saved === "object") {
        setOpen((s) => ({ ...s, ...saved }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (m: MallId) =>
    setOpen((s) => {
      const next = { ...s, [m]: !s[m] };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 shrink-0 overflow-y-auto border-r bg-[var(--surface)] transition-transform max-lg:hidden lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          <Link href="/" className="block" onClick={() => setMobileOpen(false)}>
            <div className="text-xl font-bold tracking-tight">MUSOU-EC</div>
            <div className="text-xs text-[var(--muted)]">{t("appTagline")}</div>
          </Link>
        </div>

        <nav className="px-2 pb-8 text-sm">
          <NavLink href="/" active={pathname === "/"} label={t("nav_dashboard")} icon="home" onClick={() => setMobileOpen(false)} />
          <NavLink href="/mypage/" active={pathname.startsWith("/mypage")} label="マイページ" icon="bookmark" onClick={() => setMobileOpen(false)} />
          <NavLink href="/learn/" active={pathname.startsWith("/learn")} label="学ぶ" icon="book" onClick={() => setMobileOpen(false)} />
          <Link
            href="/wishlist/"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 font-medium hover:opacity-90 ${
              pathname.startsWith("/wishlist") ? "font-semibold" : ""
            }`}
            style={{
              background: "color-mix(in srgb, var(--brand) 12%, transparent)",
              color: "var(--brand)",
            }}
          >
            <Glyph name="bulb" size={17} />
            あったらいいな
          </Link>
          <NavLink href="/settings/" active={pathname.startsWith("/settings")} label={t("nav_settings")} icon="settings" onClick={() => setMobileOpen(false)} />

          <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t("section_tools")}
          </div>

          {MALL_ORDER.map((mid) => {
            const mall = MALLS[mid];
            const tools = toolsByMall(mid);
            return (
              <div key={mid} className="mb-1">
                <button
                  onClick={() => toggle(mid)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-[var(--surface-soft)]"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: mall.color }}
                  />
                  <span className="flex-1 font-medium">{mall.label}</span>
                  <span className="text-[var(--muted)]">{open[mid] ? "−" : "+"}</span>
                </button>
                {open[mid] && (
                  <ul className="mb-1 ml-4 border-l pl-2" style={{ borderColor: mall.color }}>
                    {tools.map((tool) => {
                      const href = `/tools/${tool.slug}/`;
                      const active = pathname === href;
                      const cls = `flex items-center gap-2 rounded-md px-2 py-1.5 leading-snug hover:bg-[var(--surface-soft)] ${
                        active ? "bg-[var(--surface-soft)] font-semibold" : ""
                      }`;
                      const body = (
                        <>
                          <ToolIcon name={tool.icon} color={mall.color} size={22} variant="soft" />
                          <span className="flex-1">{tool.name}</span>
                          {tool.external ? (
                            <Glyph name="external" size={12} className="text-[var(--muted)]" />
                          ) : (
                            <>
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                title={getStatus(tool) === "live" ? "稼働中" : "開発中"}
                                style={{ background: STATUS_COLOR[getStatus(tool)] }}
                              />
                              {tool.kind === "extension" && (
                                <Glyph name="layers" size={12} className="text-[var(--muted)]" />
                              )}
                              {tool.kind === "byok" && (
                                <Glyph name="key" size={12} className="text-[var(--muted)]" />
                              )}
                            </>
                          )}
                        </>
                      );
                      return (
                        <li key={tool.slug}>
                          {tool.external ? (
                            <a href={tool.external} target="_blank" rel="noopener noreferrer" className={cls}>
                              {body}
                            </a>
                          ) : (
                            <Link href={href} onClick={() => setMobileOpen(false)} className={cls}>
                              {body}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

        </nav>
      </aside>
    </>
  );
}

function NavLink({
  href,
  active,
  label,
  icon,
  onClick,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 hover:bg-[var(--surface-soft)] ${
        active ? "bg-[var(--surface-soft)] font-semibold" : ""
      }`}
    >
      <Glyph name={icon} size={17} className="text-[var(--muted)]" />
      {label}
    </Link>
  );
}
