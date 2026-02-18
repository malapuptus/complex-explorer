/**
 * RtTimeline, RtHistogram, FlagBreakdownChart, ResponseClusters — pure SVG/HTML chart components.
 * No external chart deps. Ticket 0265 + 0272 + 0274.
 */

import type { TimelinePoint, FlagKind } from "@/domain";

// ── RtTimeline ────────────────────────────────────────────────────────

interface RtTimelineProps {
  points: TimelinePoint[];
  onPointClick?: (sessionTrialIndex: number) => void;
  /** Optional baseline median/p90 overlay lines (0274) */
  baselineMedian?: number;
  baselineP90?: number;
}

export function RtTimeline({ points, onPointClick, baselineMedian, baselineP90 }: RtTimelineProps) {
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
      {/* 0274: Baseline overlay lines */}
      {baselineMedian !== undefined && (
        <line
          data-testid="baseline-median-line"
          x1={PAD.left}
          y1={toY(baselineMedian)}
          x2={PAD.left + plotW}
          y2={toY(baselineMedian)}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.5}
          className="text-muted-foreground"
          aria-label={`Baseline median: ${baselineMedian}ms`}
        />
      )}
      {baselineP90 !== undefined && (
        <line
          data-testid="baseline-p90-line"
          x1={PAD.left}
          y1={toY(baselineP90)}
          x2={PAD.left + plotW}
          y2={toY(baselineP90)}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.35}
          className="text-muted-foreground"
          aria-label={`Baseline p90: ${baselineP90}ms`}
        />
      )}
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
  /** Optional baseline markers (0274) */
  baselineMedian?: number;
  baselineP90?: number;
}

export function RtHistogram({ histogram, baselineMedian, baselineP90 }: RtHistogramProps) {
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

  const minEdge = binEdges[0];
  const maxEdge = binEdges[binEdges.length - 1];
  const edgeRange = maxEdge - minEdge || 1;

  const toHistX = (val: number) => PAD.left + ((val - minEdge) / edgeRange) * plotW;

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
      {/* 0274: Baseline vertical markers */}
      {baselineMedian !== undefined && (
        <line
          data-testid="baseline-hist-median"
          x1={toHistX(baselineMedian)}
          y1={PAD.top}
          x2={toHistX(baselineMedian)}
          y2={PAD.top + plotH}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.5}
          className="text-muted-foreground"
        />
      )}
      {baselineP90 !== undefined && (
        <line
          data-testid="baseline-hist-p90"
          x1={toHistX(baselineP90)}
          y1={PAD.top}
          x2={toHistX(baselineP90)}
          y2={PAD.top + plotH}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 3"
          opacity={0.35}
          className="text-muted-foreground"
        />
      )}
      {/* X axis labels */}
      <text x={PAD.left} y={H - 6} fontSize={9} fill="currentColor" textAnchor="start" className="text-muted-foreground">
        {Math.round(binEdges[0])}
      </text>
      <text x={PAD.left + plotW} y={H - 6} fontSize={9} fill="currentColor" textAnchor="end" className="text-muted-foreground">
        {Math.round(binEdges[binEdges.length - 1])}
      </text>
    </svg>
  );
}

// ── FlagBreakdownChart (0272 + 0284) ──────────────────────────────────

const FLAG_LABELS: Partial<Record<FlagKind, string>> = {
  timing_outlier_slow: "Slow",
  timing_outlier_fast: "Fast",
  empty_response: "Empty",
  repeated_response: "Repeated",
  high_editing: "High editing",
  timeout: "Timeout",
};

const FLAG_EXPLANATIONS: Partial<Record<FlagKind, string>> = {
  timing_outlier_slow: "Reaction time was unusually slow (MAD-based outlier).",
  timing_outlier_fast: "Reaction time was under 200 ms (unusually fast).",
  empty_response: "No text was entered before submission.",
  repeated_response: "This exact response appeared in a previous trial.",
  high_editing: "An unusually high number of edits occurred.",
  timeout: "The trial ended because the time limit was reached.",
};

interface FlagBreakdownChartProps {
  counts: Partial<Record<FlagKind, number>>;
  /** 0284: callback when a bar is clicked */
  onFlagClick?: (flag: FlagKind) => void;
  /** 0284: currently active flag filter */
  activeFlag?: FlagKind | null;
}

export function FlagBreakdownChart({ counts, onFlagClick, activeFlag }: FlagBreakdownChartProps) {
  const entries = (Object.entries(counts) as [FlagKind, number][])
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    return (
      <div
        data-testid="flag-breakdown-chart"
        className="flex h-20 items-center justify-center text-xs text-muted-foreground"
      >
        No flags
      </div>
    );
  }

  const maxCount = entries[0][1];

  return (
    <div data-testid="flag-breakdown-chart" className="space-y-1.5">
      {entries.map(([flag, count]) => {
        const isActive = activeFlag === flag;
        return (
          <div
            key={flag}
            className={`flex items-center gap-2 ${onFlagClick ? "cursor-pointer rounded px-1 hover:bg-muted/50" : ""} ${isActive ? "bg-muted/60" : ""}`}
            onClick={() => onFlagClick?.(flag)}
            data-flag={flag}
            title={FLAG_EXPLANATIONS[flag]}
          >
            <span className="w-20 shrink-0 text-right text-[11px] text-muted-foreground">
              {FLAG_LABELS[flag] ?? flag}
            </span>
            <div className="flex-1 overflow-hidden rounded-full bg-muted" style={{ height: 10 }}>
              <div
                className={`h-full rounded-full ${isActive ? "bg-destructive" : "bg-destructive/60"}`}
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-5 text-[11px] font-mono text-muted-foreground">{count}</span>
          </div>
        );
      })}
      {/* 0284: "Why am I seeing this?" hint */}
      {activeFlag && FLAG_EXPLANATIONS[activeFlag] && (
        <p className="mt-1 rounded bg-muted/40 px-2 py-1 text-[10px] italic text-muted-foreground">
          {FLAG_EXPLANATIONS[activeFlag]}
        </p>
      )}
    </div>
  );
}

// ── ResponseClusters (0272 + 0284) ────────────────────────────────────

interface Cluster {
  response: string;
  count: number;
  words: string[];
  sessionTrialIndices: number[];
}

interface ResponseClustersProps {
  clusters: Cluster[];
  /** 0284: callback when a cluster is clicked */
  onClusterClick?: (indices: number[]) => void;
  /** 0284: currently active cluster (by response string) */
  activeClusterResponse?: string | null;
}

export function ResponseClusters({ clusters, onClusterClick, activeClusterResponse }: ResponseClustersProps) {
  if (clusters.length === 0) {
    return (
      <div
        data-testid="response-clusters"
        className="flex h-20 items-center justify-center text-xs text-muted-foreground"
      >
        No repeated responses
      </div>
    );
  }

  return (
    <ul data-testid="response-clusters" className="divide-y divide-border rounded-md border border-border text-xs">
      {clusters.map((c) => {
        const isActive = activeClusterResponse === c.response;
        return (
          <li
            key={c.response}
            className={`flex items-center justify-between px-3 py-1.5 ${onClusterClick ? "cursor-pointer hover:bg-muted/50" : ""} ${isActive ? "bg-muted/60" : ""}`}
            onClick={() => onClusterClick?.(c.sessionTrialIndices)}
            data-cluster-response={c.response}
            title={`Click to filter table to these ${c.count} trials`}
          >
            <span className="font-mono font-medium text-foreground">
              {c.response || <span className="italic text-muted-foreground">(empty)</span>}
            </span>
            <span className="ml-2 text-muted-foreground">
              {c.count}× · {c.words.slice(0, 4).join(", ")}
              {c.words.length > 4 ? "…" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
