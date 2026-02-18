/**
 * BrandLogo — CE wordmark rendered as an SVG text lockup.
 * Uses brand palette tokens via currentColor / CSS vars.
 * T0231.
 */

interface BrandLogoProps {
  /** Pixel height of the rendered logo (default 40) */
  height?: number;
  className?: string;
}

export function BrandLogo({ height = 40, className = "" }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 60"
      height={height}
      aria-label="Complex Mapper — CE wordmark"
      role="img"
      className={className}
      style={{ display: "block" }}
    >
      {/* Ink stroke wordmark */}
      <text
        x="50%"
        y="38"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="2"
        fill="hsl(var(--primary))"
      >
        COMPLEX MAPPER
      </text>
      {/* Sand underline accent */}
      <line
        x1="20"
        y1="48"
        x2="220"
        y2="48"
        stroke="hsl(var(--accent))"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
