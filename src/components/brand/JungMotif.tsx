/**
 * JungMotif — subtle Red Book–inspired ring/mandala linework.
 * Used only on Home and empty states, never behind data.
 * Opacity is controlled by --motif-opacity CSS var (default 0.045).
 * T0XXV.
 */

interface JungMotifProps {
  className?: string;
  /** Override size in px (default 480) */
  size?: number;
}

export function JungMotif({ className = "", size = 480 }: JungMotifProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 480 480"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ opacity: "var(--motif-opacity, 0.045)" }}
    >
      {/* Outer ring */}
      <circle cx="240" cy="240" r="220" fill="none" stroke="hsl(26,48%,23%)" strokeWidth="1" />
      <circle cx="240" cy="240" r="200" fill="none" stroke="hsl(26,48%,23%)" strokeWidth="0.5" />

      {/* Mid rings */}
      <circle cx="240" cy="240" r="160" fill="none" stroke="hsl(28,36%,41%)" strokeWidth="0.75" />
      <circle cx="240" cy="240" r="120" fill="none" stroke="hsl(28,36%,41%)" strokeWidth="0.5" />
      <circle cx="240" cy="240" r="80"  fill="none" stroke="hsl(32,39%,59%)" strokeWidth="0.75" />
      <circle cx="240" cy="240" r="40"  fill="none" stroke="hsl(32,39%,59%)" strokeWidth="0.5" />

      {/* Inner focal point */}
      <circle cx="240" cy="240" r="6" fill="none" stroke="hsl(26,48%,23%)" strokeWidth="1" />

      {/* 8 radial spokes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 240 + 44 * Math.cos(rad);
        const y1 = 240 + 44 * Math.sin(rad);
        const x2 = 240 + 218 * Math.cos(rad);
        const y2 = 240 + 218 * Math.sin(rad);
        return (
          <line
            key={angle}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="hsl(26,48%,23%)"
            strokeWidth="0.4"
          />
        );
      })}

      {/* 16 short arc ticks at outer ring */}
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i * 22.5 * Math.PI) / 180;
        const r1 = 198, r2 = 222;
        return (
          <line
            key={i}
            x1={240 + r1 * Math.cos(angle)}
            y1={240 + r1 * Math.sin(angle)}
            x2={240 + r2 * Math.cos(angle)}
            y2={240 + r2 * Math.sin(angle)}
            stroke="hsl(26,48%,23%)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Petal arcs (4-fold) */}
      {[0, 90, 180, 270].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 240 + 80 * Math.cos(rad);
        const cy = 240 + 80 * Math.sin(rad);
        return (
          <circle
            key={angle}
            cx={cx} cy={cy} r="40"
            fill="none"
            stroke="hsl(45,31%,68%)"
            strokeWidth="0.5"
          />
        );
      })}
    </svg>
  );
}
