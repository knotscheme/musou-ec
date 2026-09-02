"use client";

import { useState, type ComponentType } from "react";
import { ToolShell, BareToolShellContext } from "@/components/ToolShell";

export interface HubTab {
  label: string;
  hint?: string;
  Comp: ComponentType;
}

/** 複数のツールをタブで内包するハブ。各ツールのヘッダーは Bare コンテキストで抑止する。 */
export function Hub({ slug, tabs }: { slug: string; tabs: HubTab[] }) {
  const [i, setI] = useState(0);
  const Active = tabs[i].Comp;
  return (
    <ToolShell slug={slug}>
      <div className="-mt-1 flex flex-wrap gap-1 border-b">
        {tabs.map((t, n) => (
          <button
            key={t.label}
            onClick={() => setI(n)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
              n === i
                ? "border-[var(--brand)] text-[var(--brand)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs[i].hint && <p className="text-xs text-[var(--muted)]">{tabs[i].hint}</p>}
      <BareToolShellContext.Provider value={true}>
        <Active key={i} />
      </BareToolShellContext.Provider>
    </ToolShell>
  );
}
