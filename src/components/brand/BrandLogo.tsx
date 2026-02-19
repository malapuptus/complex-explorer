/**
 * BrandLogo — CE wordmark rendered as an inline SVG text lockup.
 * Uses brand palette tokens via CSS vars. T0231 / T0234.
 *
 * T0234 fix: SVG viewBox is wide enough to contain the full text at all
 * sizes. Text is anchored at the midpoint so it can never be clipped by
 * an overflow-hidden parent — the component owns 100% of its width.
 */

interface BrandLogoProps {
  /** Pixel height of the rendered logo (default 40) */
  height?: number;
  className?: string;
}

export function BrandLogo({ height = 40, className = "" }: BrandLogoProps) {
  // viewBox is intentionally wider than the text so no edge can clip.
  // width is derived from the aspect ratio (320 × 64 → 5:1) so the SVG
  // always scales proportionally regardless of the parent container width.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 64"
      height={height}
      width={height * 5}
      aria-label="Complex Mapper — CE wordmark"
      role="img"
      className={className}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* Serif wordmark — midpoint anchored, never clips */}
      <text
        x="160"
        y="40"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="3"
        fill="hsl(var(--foreground))"
      >
        COMPLEX EXPLORER
      </text>
      {/* Sand underline accent */}
      <line x1="24" y1="51" x2="296" y2="51" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
