/**
 * CiBreakdownChart — SVG bar chart for CI code counts.
 * No dependencies. Ticket 0278.
 */

import type { CiCode } from "@/domain";
import { CI_CODE_ORDER, CI_CODE_LABELS } from "@/domain";

interface Props {
  counts: Partial<Record<CiCode, number>>;
  /** If set, clicking a bar calls this with the CI code. */
  onCodeClick?: (code: CiCode) => void;
  /** Which code is currently "active" (highlighted). */
  activeCode?: CiCode | null;
}

const BAR_HEIGHT = 18;
const BAR_GAP = 6;
const LABEL_W = 72;
const COUNT_W = 28;
const BAR_MAX_W = 120;

export function CiBreakdownChart({ counts, onCodeClick, activeCode }: Props) {
  const visible = CI_CODE_ORDER.filter((c) => (counts[c] ?? 0) > 0);

  if (visible.length === 0) {
    return (
      <p
        data-testid="ci-breakdown-chart"
        className="text-xs text-muted-foreground italic"
      >
        No CI codes recorded.
      </p>
    );
  }

  const maxCount = Math.max(...visible.map((c) => counts[c] ?? 0));
  const svgH = visible.length * (BAR_HEIGHT + BAR_GAP) - BAR_GAP;
  const svgW = LABEL_W + BAR_MAX_W + COUNT_W + 8;

  return (
    <svg
      data-testid="ci-breakdown-chart"
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full overflow-visible"
      aria-label="CI code breakdown"
    >
      {visible.map((code, i) => {
        const count = counts[code] ?? 0;
        const barW = Math.max(4, Math.round((count / maxCount) * BAR_MAX_W));
        const y = i * (BAR_HEIGHT + BAR_GAP);
        const isActive = activeCode === code;
        return (
          <g
            key={code}
            transform={`translate(0,${y})`}
            style={{ cursor: onCodeClick ? "pointer" : "default" }}
            onClick={() => onCodeClick?.(code)}
            data-ci-code={code}
          >
            {/* label */}
            <text
              x={LABEL_W - 4}
              y={BAR_HEIGHT / 2 + 1}
              dominantBaseline="middle"
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
              className="fill-muted-foreground"
            >
              {CI_CODE_LABELS[code]}
            </text>
            {/* bar */}
            <rect
              x={LABEL_W}
              y={0}
              width={barW}
              height={BAR_HEIGHT}
              rx={3}
              className={
                isActive
                  ? "fill-primary"
                  : "fill-primary/50"
              }
            />
            {/* count */}
            <text
              x={LABEL_W + barW + 4}
              y={BAR_HEIGHT / 2 + 1}
              dominantBaseline="middle"
              fontSize={10}
              className="fill-foreground font-mono"
              fill="currentColor"
            >
              {count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
