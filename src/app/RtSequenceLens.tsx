/**
 * RtSequenceLens — T0257: mini SVG chart of RT across trial order.
 * Flagged trials get markers. Hover tooltip. Click to jump to StimulusTable row.
 * Optional z-score normalization toggle.
 */

import { useState, useMemo, useCallback } from "react";
import type { Trial, TrialFlag, FlagKind } from "@/domain";
import { getResponseText } from "@/domain";
import type { TrialAnnotation } from "@/infra";
import { getComplexColorForTrial } from "./ComplexColorLegend";

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  hideResponses?: boolean;
  onJumpToTrial?: (index: number) => void;
  /** T0262: complex color map */
  complexColorMap?: Record<string, number>;
  /** T0262: session annotations for color lookup */
  sessionAnnotations?: Record<number, TrialAnnotation>;
}

const FLAG_LABELS: Record<string, string> = {
  timing_outlier_slow: "Slow",
  timing_outlier_fast: "Fast",
  empty_response: "Empty",
  repeated_response: "Repeated",
  high_editing: "High editing",
  timeout: "Timeout",
};

interface DataPoint {
  index: number;
  rt: number;
  word: string;
  response: string;
  flags: FlagKind[];
  value: number; // raw RT or z-score depending on mode
}

function computeZScores(rts: number[]): number[] {
  if (rts.length === 0) return [];
  const mean = rts.reduce((a, b) => a + b, 0) / rts.length;
  const variance = rts.reduce((a, b) => a + (b - mean) ** 2, 0) / rts.length;
  const sd = Math.sqrt(variance);
  if (sd === 0) return rts.map(() => 0);
  return rts.map((rt) => (rt - mean) / sd);
}

export function RtSequenceLens({ trials, trialFlags, hideResponses, onJumpToTrial, complexColorMap = {}, sessionAnnotations = {} }: Props) {
  const [normalize, setNormalize] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const data = useMemo<DataPoint[]>(() => {
    const rts = trials.map((t) => t.association.reactionTimeMs);
    const zScores = normalize ? computeZScores(rts) : rts;
    return trials.map((trial, i) => ({
      index: i,
      rt: trial.association.reactionTimeMs,
      word: trial.stimulus.word,
      response: hideResponses ? "—" : getResponseText(trial),
      flags: (trialFlags[i]?.flags ?? []) as FlagKind[],
      value: zScores[i],
    }));
  }, [trials, trialFlags, normalize, hideResponses]);

  const { minVal, maxVal } = useMemo(() => {
    if (data.length === 0) return { minVal: 0, maxVal: 1 };
    const vals = data.map((d) => d.value);
    return { minVal: Math.min(...vals), maxVal: Math.max(...vals) };
  }, [data]);

  const width = 700;
  const height = 140;
  const padding = { top: 20, right: 20, bottom: 25, left: 45 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const xScale = useCallback(
    (i: number) => padding.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    [data.length, plotW],
  );

  const yScale = useCallback(
    (v: number) => {
      const range = maxVal - minVal || 1;
      return padding.top + plotH - ((v - minVal) / range) * plotH;
    },
    [minVal, maxVal, plotH],
  );

  // Build path
  const linePath = useMemo(() => {
    if (data.length === 0) return "";
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(d.value).toFixed(1)}`)
      .join(" ");
  }, [data, xScale, yScale]);

  if (data.length === 0) return null;

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2" data-testid="rt-sequence-lens">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-xs font-semibold text-foreground hover:text-primary"
        >
          Sequence Lens {collapsed ? "▶" : "▼"}
        </button>
        {!collapsed && (
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={normalize}
              onChange={(e) => setNormalize(e.target.checked)}
              className="h-3 w-3 rounded border-border"
            />
            Normalize (z-score)
          </label>
        )}
      </div>

      {!collapsed && (
        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            style={{ minWidth: Math.max(400, data.length * 6) }}
          >
            {/* Y-axis label */}
            <text
              x={8}
              y={padding.top + plotH / 2}
              className="fill-muted-foreground"
              fontSize={9}
              textAnchor="middle"
              transform={`rotate(-90, 8, ${padding.top + plotH / 2})`}
            >
              {normalize ? "z-score" : "RT (ms)"}
            </text>

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />

            {/* Dots */}
            {data.map((d, i) => {
              const cx = xScale(i);
              const cy = yScale(d.value);
              const isFlagged = d.flags.length > 0;
              const isHovered = hoveredIndex === i;
              // T0262: complex color
              const ann = sessionAnnotations[i];
              const complexInfo = getComplexColorForTrial(complexColorMap, ann?.candidateComplexes);
              const markerColor = complexInfo ? complexInfo.color : undefined;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={isFlagged ? 4 : isHovered ? 3 : 2}
                  fill={markerColor ?? undefined}
                  className={
                    markerColor
                      ? "cursor-pointer"
                      : isFlagged
                        ? "fill-destructive stroke-destructive cursor-pointer"
                        : "fill-primary/60 stroke-primary/60 cursor-pointer"
                  }
                  strokeWidth={isHovered ? 2 : 0}
                  stroke={markerColor ?? undefined}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => onJumpToTrial?.(i)}
                />
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-10 rounded-md border border-border bg-card px-2.5 py-1.5 shadow-md"
              style={{
                left: Math.min(xScale(hoveredPoint.index), width - 160),
                top: 0,
              }}
            >
              <p className="text-[10px] font-mono text-muted-foreground">#{hoveredPoint.index + 1}</p>
              <p className="text-xs font-medium text-foreground">{hoveredPoint.word}</p>
              {!hideResponses && (
                <p className="text-[10px] text-muted-foreground">→ {hoveredPoint.response || "(empty)"}</p>
              )}
              <p className="text-[10px] font-mono text-foreground">{hoveredPoint.rt} ms</p>
              {hoveredPoint.flags.length > 0 && (
                <p className="text-[10px] text-destructive">
                  {hoveredPoint.flags.map((f) => FLAG_LABELS[f] ?? f).join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
