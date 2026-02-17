/**
 * RtTimeline and RtHistogram — pure SVG chart components.
 * No external chart deps. Ticket 0265.
 */

import type { TimelinePoint } from "@/domain";

// ── RtTimeline ────────────────────────────────────────────────────────

interface RtTimelineProps {
  points: TimelinePoint[];
  onPointClick?: (sessionTrialIndex: number) => void;
}

export function RtTimeline({ points, onPointClick }: RtTimelineProps) {
  if (points.length === 0) {
    return (
      <div
        data-testid="rt-timeline"
        className="flex h-40 items-center justify-center rounded-md border border-border bg-muted/20 text-xs text-muted-foreground"
      >
        No data
      </div>
    );
  }

  const W = 600;
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 28, left: 44 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const allYs = points.map((p) => p.y);
  const minY = Math.min(...allYs);
  const maxY = Math.max(...allYs);
  const yRange = maxY - minY || 1;

  const toX = (i: number) =>
    PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const toY = (y: number) => PAD.top + plotH - ((y - minY) / yRange) * plotH;

  return (
    <svg
      data-testid="rt-timeline"
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 160 }}
      role="img"
      aria-label="Reaction time timeline"
    >
      {/* Y axis label */}
      <text
        x={PAD.left - 4}
        y={PAD.top + plotH / 2}
        textAnchor="end"
        dominantBaseline="middle"
        fontSize={9}
        fill="currentColor"
        className="text-muted-foreground"
      >
        RT
      </text>
      {/* X axis line */}
      <line
        x1={PAD.left}
        y1={PAD.top + plotH}
        x2={PAD.left + plotW}
        y2={PAD.top + plotH}
        stroke="currentColor"
        strokeWidth={1}
        className="text-border"
        opacity={0.4}
      />
      {/* Connecting line */}
      {points.length > 1 && (
        <polyline
          points={points.map((p, i) => `${toX(i)},${toY(p.y)}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          opacity={0.35}
          className="text-primary"
        />
      )}
      {/* Data points */}
      {points.map((p, i) => {
        const cx = toX(i);
        const cy = toY(p.y);
        const isFlagged = p.flags.length > 0;
        const label = `Trial ${p.sessionTrialIndex + 1}: ${p.y}ms${isFlagged ? " (flagged)" : ""}${p.timedOut ? " (timeout)" : ""}`;
        return (
          <circle
            key={p.sessionTrialIndex}
            cx={cx}
            cy={cy}
            r={5}
            data-session-trial-index={p.sessionTrialIndex}
            aria-label={label}
            className={
              p.timedOut
                ? "fill-muted-foreground"
                : isFlagged
                ? "fill-destructive"
                : "fill-primary"
            }
            style={{ cursor: onPointClick ? "pointer" : undefined }}
            onClick={() => onPointClick?.(p.sessionTrialIndex)}
          />
        );
      })}
    </svg>
  );
}

// ── RtHistogram ───────────────────────────────────────────────────────

interface RtHistogramProps {
  histogram: { binEdges: number[]; counts: number[] };
}

export function RtHistogram({ histogram }: RtHistogramProps) {
  const { binEdges, counts } = histogram;

  if (counts.length === 0) {
    return (
      <div
        data-testid="rt-histogram"
        className="flex h-28 items-center justify-center rounded-md border border-border bg-muted/20 text-xs text-muted-foreground"
      >
        No data
      </div>
    );
  }

  const W = 600;
  const H = 100;
  const PAD = { top: 8, right: 8, bottom: 28, left: 36 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxCount = Math.max(...counts, 1);
  const binCount = counts.length;
  const barW = plotW / binCount;

  return (
    <svg
      data-testid="rt-histogram"
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 120 }}
      role="img"
      aria-label="Reaction time histogram"
    >
      {/* X axis */}
      <line
        x1={PAD.left}
        y1={PAD.top + plotH}
        x2={PAD.left + plotW}
        y2={PAD.top + plotH}
        stroke="currentColor"
        strokeWidth={1}
        opacity={0.4}
        className="text-border"
      />
      {counts.map((c, i) => {
        const barH = (c / maxCount) * plotH;
        const x = PAD.left + i * barW;
        const y = PAD.top + plotH - barH;
        const label = `${Math.round(binEdges[i])}–${Math.round(binEdges[i + 1])} ms: ${c}`;
        return (
          <rect
            key={i}
            x={x + 1}
            y={y}
            width={barW - 2}
            height={barH}
            aria-label={label}
            className="fill-primary"
            opacity={0.7}
          />
        );
      })}
      {/* X axis labels: first + last bin edge */}
      <text
        x={PAD.left}
        y={H - 6}
        fontSize={9}
        fill="currentColor"
        textAnchor="start"
        className="text-muted-foreground"
      >
        {Math.round(binEdges[0])}
      </text>
      <text
        x={PAD.left + plotW}
        y={H - 6}
        fontSize={9}
        fill="currentColor"
        textAnchor="end"
        className="text-muted-foreground"
      >
        {Math.round(binEdges[binEdges.length - 1])}
      </text>
    </svg>
  );
}
