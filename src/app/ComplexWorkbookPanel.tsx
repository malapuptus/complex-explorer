/**
 * ComplexWorkbookPanel — T0255: group and filter trials by candidate complex label.
 * T0262: Color swatches for each label.
 */

import { useMemo } from "react";
import type { TrialAnnotation } from "@/infra";
import { uiPrefs } from "@/infra";
import { getComplexColor, nextColorIndex } from "./ComplexColorLegend";

interface Props {
  sessionAnnotations: Record<number, TrialAnnotation>;
  activeComplex: string | null;
  onComplexFilter: (label: string | null) => void;
  /** T0262: color map from uiPrefs */
  complexColorMap?: Record<string, number>;
  onColorChange?: (label: string, colorIndex: number) => void;
  onClearColors?: () => void;
}

export function ComplexWorkbookPanel({
  sessionAnnotations, activeComplex, onComplexFilter,
  complexColorMap = {}, onColorChange, onClearColors,
}: Props) {
  const complexCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ann of Object.values(sessionAnnotations)) {
      for (const label of (ann.candidateComplexes ?? [])) {
        counts[label] = (counts[label] ?? 0) + 1;
      }
    }
    return counts;
  }, [sessionAnnotations]);

  const labels = Object.keys(complexCounts).sort();

  if (labels.length === 0) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/10 px-4 py-3" data-testid="complex-workbook-empty">
        <p className="text-xs text-muted-foreground">
          No candidate complexes tagged yet. Open a trial's detail panel to add labels.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/10 px-4 py-3 space-y-2" data-testid="complex-workbook-panel">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Complex Workbook</h4>
        <div className="flex items-center gap-2">
          {onClearColors && (
            <button
              onClick={onClearColors}
              className="text-[10px] text-muted-foreground hover:text-foreground"
              data-testid="clear-complex-colors"
            >
              Clear colors
            </button>
          )}
          {activeComplex && (
            <button
              onClick={() => onComplexFilter(null)}
              className="text-[10px] text-primary underline"
              data-testid="clear-complex-filter"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => {
          const color = getComplexColor(complexColorMap, label);
          return (
            <div key={label} className="flex items-center gap-1">
              {/* Color swatch — click to cycle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const current = complexColorMap[label] ?? 0;
                  const next = nextColorIndex(current);
                  onColorChange?.(label, next);
                }}
                className="h-3 w-3 rounded-full border border-border/50 shrink-0"
                style={{ backgroundColor: color }}
                title={`Change color for "${label}"`}
                data-testid={`complex-color-${label}`}
              />
              <button
                onClick={() => onComplexFilter(activeComplex === label ? null : label)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  activeComplex === label
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
                data-testid={`complex-label-${label}`}
              >
                {label} ({complexCounts[label]})
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
