import { PATHS } from "@/components/ToolIcon";

/**
 * インライン用のラインアイコン。currentColor を継承し、絵文字の代わりに使う。
 * <Glyph name="bulb" /> のように文字の隣に置く。
 */
export function Glyph({
  name,
  size = 16,
  className = "",
  strokeWidth = 1.9,
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const glyph = PATHS[name];
  if (!glyph) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
    >
      {glyph}
    </svg>
  );
}
