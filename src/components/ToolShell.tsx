"use client";

import Link from "next/link";
import { getTool, getStatus, MALLS, KIND_LABEL } from "@/lib/malls";
import { ToolIcon } from "@/components/ToolIcon";
import { StatusBadge, SaveButton } from "@/components/ToolMeta";

export function ToolShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  const tool = getTool(slug);
  if (!tool) return <div>Unknown tool: {slug}</div>;
  const mall = MALLS[tool.mall];

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
            <StatusBadge status={getStatus(tool)} />
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

      <div className="mt-6 space-y-5">{children}</div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span>}
    </label>
  );
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      type="number"
      inputMode="decimal"
      {...rest}
      className={`w-full rounded-md border px-3 py-2 text-sm ${className ?? ""}`}
    />
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input {...rest} className={`w-full rounded-md border px-3 py-2 text-sm ${className ?? ""}`} />
  );
}

export function Stat({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "ok" | "warn" | "bad";
}) {
  const color =
    tone === "ok" ? "#1a8a5a" : tone === "warn" ? "#a1701c" : tone === "bad" ? "#bf0000" : undefined;
  return (
    <div className="card p-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div
        className={`mt-0.5 text-lg font-bold ${accent && !color ? "text-[var(--brand)]" : ""}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`card p-4 ${className}`}>{children}</div>;
}
