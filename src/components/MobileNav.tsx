"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Glyph } from "@/components/Glyph";

const ITEMS = [
  { href: "/", icon: "home", label: "ダッシュボード", match: (p: string) => p === "/" },
  { href: "/mypage/", icon: "bookmark", label: "マイページ", match: (p: string) => p.startsWith("/mypage") },
  { href: "/learn/", icon: "book", label: "学ぶ", match: (p: string) => p.startsWith("/learn") },
  { href: "/settings/", icon: "settings", label: "設定", match: (p: string) => p.startsWith("/settings") },
] as const;

/** モバイル専用のフローティング下部ナビ（PC はサイドバーを使う）。 */
export function MobileNav() {
  const pathname = usePathname();
  const cell = "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-semibold leading-tight text-center transition";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div className="mx-auto mb-3 flex w-[calc(100%-1.25rem)] max-w-md items-stretch justify-around gap-0.5 rounded-2xl border bg-[var(--surface)] p-1 shadow-[0_10px_34px_rgba(0,0,0,.2)]">
        {ITEMS.map((it) => {
          const on = it.match(pathname);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`${cell} ${on ? "bg-[var(--brand)] text-white" : "text-[var(--muted)]"}`}
            >
              <Glyph name={it.icon} size={19} />
              {it.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("musou:toggle-chat"))}
          className={`${cell} text-[var(--muted)]`}
        >
          <Glyph name="chat" size={19} />
          AIチャット
        </button>
      </div>
    </nav>
  );
}
