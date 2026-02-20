/**
 * CiSummaryPanel — T0250: Complex Indicators summary at top of results.
 * Shows flag counts + clickable flagged items with sequence context.
 */

import { useState, useMemo } from "react";
import type { Trial, TrialFlag, FlagKind } from "@/domain";
import { getResponseText } from "@/domain";

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  hideResponses?: boolean;
  /** T0253: callback to jump to a trial in the StimulusTable. */
  onJumpToTrial?: (index: number) => void;
}

const FLAG_LABELS: Record<string, string> = {
  timing_outlier_slow: "Slow outlier",
  timing_outlier_fast: "Fast outlier",
  empty_response: "Empty response",
  repeated_response: "Repeated response",
  high_editing: "High editing",
  timeout: "Timed out",
};

interface FlaggedItem {
  index: number;
  word: string;
  response: string;
  rt: number;
  flags: FlagKind[];
}

export function CiSummaryPanel({ trials, trialFlags, hideResponses, onJumpToTrial }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Count flags by type
  const flagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tf of trialFlags) {
      for (const f of tf.flags) {
        counts[f] = (counts[f] || 0) + 1;
      }
    }
    return counts;
  }, [trialFlags]);

  // Flagged items list
  const flaggedItems = useMemo<FlaggedItem[]>(() => {
    const items: FlaggedItem[] = [];
    for (let i = 0; i < trials.length; i++) {
      const flags = (trialFlags[i]?.flags ?? []) as FlagKind[];
      if (flags.length > 0) {
        items.push({
          index: i,
          word: trials[i].stimulus.word,
          response: getResponseText(trials[i]),
          rt: trials[i].association.reactionTimeMs,
          flags,
        });
      }
    }
    return items;
  }, [trials, trialFlags]);

  if (flaggedItems.length === 0) return null;

  // Sequence context: 2 before + 2 after
  const contextWindow = expandedIndex !== null ? getContext(expandedIndex, trials, trialFlags) : [];

  // Detect perseveration pattern: slow RTs clustering after a trigger
  const perseverationNote = expandedIndex !== null ? detectPerseveration(expandedIndex, contextWindow) : null;

  return (
    <div className="rounded-md border border-border bg-muted/20 p-4 space-y-4" data-testid="ci-summary-panel">
      <h3 className="text-sm font-semibold text-foreground">Complex Indicators</h3>

      {/* Flag type counts */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(flagCounts).map(([flag, count]) => (
          <span
            key={flag}
            className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
          >
            {FLAG_LABELS[flag] ?? flag}: {count}
          </span>
        ))}
      </div>

      {/* Flagged items list */}
      <div className="space-y-1">
        {flaggedItems.map((item) => {
          const isExpanded = expandedIndex === item.index;
          return (
            <div key={item.index}>
              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : item.index)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/40 transition-colors"
              >
                <span className="font-mono text-muted-foreground w-6 shrink-0">#{item.index + 1}</span>
                <span className="font-medium text-foreground">{item.word}</span>
                <span className="text-destructive">{item.flags.map((f) => FLAG_LABELS[f] ?? f).join(", ")}</span>
                <span className="ml-auto font-mono text-muted-foreground">{item.rt}ms</span>
                {onJumpToTrial && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onJumpToTrial(item.index); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onJumpToTrial(item.index); } }}
                    className="rounded px-1.5 py-0.5 text-[9px] text-primary hover:bg-primary/10"
                    title="Jump to this trial in the table"
                  >
                    jump ↓
                  </span>
                )}
                <span className="text-muted-foreground text-[10px]">{isExpanded ? "▲" : "▼"}</span>
              </button>

              {/* Sequence context */}
              {isExpanded && (
                <div className="ml-8 mt-1 mb-2 rounded-md border border-border bg-card p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Sequence context
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-0.5">#</th>
                        <th className="text-left py-0.5">Stimulus</th>
                        {!hideResponses && <th className="text-left py-0.5">Response</th>}
                        <th className="text-right py-0.5">RT</th>
                        <th className="text-left py-0.5 pl-2">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contextWindow.map((ctx) => (
                        <tr
                          key={ctx.index}
                          className={ctx.index === item.index ? "bg-destructive/10 font-semibold" : ""}
                        >
                          <td className="py-0.5 font-mono text-muted-foreground">{ctx.index + 1}</td>
                          <td className="py-0.5 text-foreground">{ctx.word}</td>
                          {!hideResponses && (
                            <td className="py-0.5 text-foreground">
                              {ctx.response || <span className="italic text-muted-foreground">(empty)</span>}
                            </td>
                          )}
                          <td className="py-0.5 text-right font-mono text-foreground">{ctx.rt}</td>
                          <td className="py-0.5 pl-2 text-destructive">
                            {ctx.flags.length > 0 ? ctx.flags.map((f) => FLAG_LABELS[f] ?? f).join(", ") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {perseverationNote && (
                    <p className="text-[10px] italic text-muted-foreground mt-1">{perseverationNote}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ContextRow {
  index: number;
  word: string;
  response: string;
  rt: number;
  flags: FlagKind[];
}

function getContext(targetIndex: number, trials: Trial[], trialFlags: TrialFlag[]): ContextRow[] {
  const start = Math.max(0, targetIndex - 2);
  const end = Math.min(trials.length - 1, targetIndex + 2);
  const rows: ContextRow[] = [];
  for (let i = start; i <= end; i++) {
    rows.push({
      index: i,
      word: trials[i].stimulus.word,
      response: getResponseText(trials[i]),
      rt: trials[i].association.reactionTimeMs,
      flags: (trialFlags[i]?.flags ?? []) as FlagKind[],
    });
  }
  return rows;
}

function detectPerseveration(targetIndex: number, context: ContextRow[]): string | null {
  // Check if there are slow RTs clustering after the target
  const targetPos = context.findIndex((c) => c.index === targetIndex);
  if (targetPos < 0) return null;
  const after = context.slice(targetPos + 1);
  const slowAfter = after.filter((c) => c.flags.includes("timing_outlier_slow"));
  if (slowAfter.length >= 1) {
    return "Possible perseveration — slow responses cluster after this word.";
  }
  return null;
}
