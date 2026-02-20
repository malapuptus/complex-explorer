/**
 * StimulusTable — T0242: per-stimulus results table with sort + flagged filter.
 * T0243: flag detail expansion with response/stimulus, hide-responses toggle.
 * T0253: jump-to-trial highlighting + context expander per row.
 * T0254: annotation badges (emotions, complexes).
 * T0255: candidate-complex filter support.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type { Trial, TrialFlag, FlagKind } from "@/domain";
import { getResponseText, getTimedOut } from "@/domain";
import type { TrialAnnotation } from "@/infra";
import { RtBar } from "./ResultsTableControls";

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  minRt: number;
  maxRt: number;
  /** T0253: externally-set highlighted row index (from CI panel click). */
  highlightIndex?: number | null;
  /** T0254: session annotations for badges. */
  sessionAnnotations?: Record<number, TrialAnnotation>;
  /** T0255: filter to trials with this candidate complex label. */
  complexFilter?: string | null;
}

type SortKey = "order" | "rt";
type SortDir = "asc" | "desc";

const FLAG_LABELS: Record<string, string> = {
  timing_outlier_slow: "Slow outlier",
  timing_outlier_fast: "Fast outlier",
  empty_response: "Empty response",
  repeated_response: "Repeated response",
  high_editing: "High editing",
  timeout: "Timed out",
};

/** Build a human-readable explanation for a flag on a specific trial, given all rows for context. */
function flagDetail(
  flag: FlagKind,
  word: string,
  response: string,
  rt: number,
  allRows: Array<{ word: string; response: string; flags: readonly FlagKind[] }>,
): string {
  if (flag === "repeated_response" && response) {
    const stimuli = allRows
      .filter((r) => r.response === response && r.word !== word)
      .map((r) => r.word);
    if (stimuli.length > 0) {
      return `"${response}" also appeared for: ${stimuli.slice(0, 5).join(", ")}`;
    }
    return `"${response}" repeated`;
  }
  if (flag === "timing_outlier_slow") return `${rt} ms — unusually slow (MAD outlier)`;
  if (flag === "timing_outlier_fast") return `${rt} ms — unusually fast (<200 ms)`;
  if (flag === "empty_response") return `No response entered for "${word}"`;
  if (flag === "timeout") return `Time limit reached on "${word}"`;
  if (flag === "high_editing") return `Many edits/backspaces on "${word}"`;
  return flag;
}

/** T0253: Get ±2 context rows for a trial. */
function getContextRows(
  targetIndex: number,
  trials: Trial[],
  trialFlags: TrialFlag[],
  hideResponses: boolean,
) {
  const start = Math.max(0, targetIndex - 2);
  const end = Math.min(trials.length - 1, targetIndex + 2);
  const rows = [];
  for (let i = start; i <= end; i++) {
    rows.push({
      index: i,
      word: trials[i].stimulus.word,
      response: hideResponses ? "—" : getResponseText(trials[i]),
      rt: trials[i].association.reactionTimeMs,
      flags: (trialFlags[i]?.flags ?? []) as FlagKind[],
      isCurrent: i === targetIndex,
    });
  }
  return rows;
}

export function StimulusTable({
  trials, trialFlags, minRt, maxRt,
  highlightIndex, sessionAnnotations, complexFilter,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [hideResponses, setHideResponses] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [contextRow, setContextRow] = useState<number | null>(null);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({});

  // T0253: scroll + highlight when highlightIndex changes
  useEffect(() => {
    if (highlightIndex == null) return;
    setFlashIndex(highlightIndex);
    const el = rowRefs.current[highlightIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const timer = setTimeout(() => setFlashIndex(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightIndex]);

  const setRowRef = useCallback((i: number, el: HTMLTableRowElement | null) => {
    rowRefs.current[i] = el;
  }, []);

  const rows = useMemo(() => {
    return trials.map((trial, i) => {
      const flags = (trialFlags[i]?.flags ?? []) as FlagKind[];
      const response = getResponseText(trial);
      const timedOut = getTimedOut(trial, flags as string[]);
      return { trial, i, flags, response, timedOut, rt: trial.association.reactionTimeMs };
    });
  }, [trials, trialFlags]);

  const filtered = useMemo(() => {
    let result = rows;
    if (flaggedOnly) {
      result = result.filter((r) => r.flags.length > 0 || r.timedOut);
    }
    // T0255: complex filter
    if (complexFilter && sessionAnnotations) {
      result = result.filter((r) => {
        const ann = sessionAnnotations[r.i];
        return ann?.candidateComplexes?.includes(complexFilter) ?? false;
      });
    }
    return result;
  }, [rows, flaggedOnly, complexFilter, sessionAnnotations]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const val = sortKey === "rt" ? a.rt - b.rt : a.i - b.i;
      return sortDir === "asc" ? val : -val;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-0.5 text-muted-foreground opacity-40">↕</span>;
    return <span className="ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="space-y-3" data-testid="stimulus-table">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          data-testid="flagged-only-toggle"
          onClick={() => setFlaggedOnly((v) => !v)}
          className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
            flaggedOnly
              ? "bg-destructive text-destructive-foreground"
              : "border border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          {flaggedOnly ? "Flagged only ✓" : "Flagged only"}
        </button>
        <button
          data-testid="hide-responses-toggle"
          onClick={() => setHideResponses((v) => !v)}
          className={`rounded-full px-3 py-0.5 text-xs font-medium transition-colors ${
            hideResponses
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          {hideResponses ? "Responses hidden" : "Hide responses"}
        </button>
        <span className="text-xs text-muted-foreground">
          {sorted.length} of {trials.length} rows
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm" data-testid="stimulus-results-table">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th
                className="cursor-pointer select-none px-3 py-2 hover:text-foreground"
                onClick={() => toggleSort("order")}
                data-testid="sort-order-col"
              >
                Order <SortIcon col="order" />
              </th>
              <th className="px-3 py-2">Stimulus</th>
              <th className="px-3 py-2">Response</th>
              <th className="px-3 py-2 text-right">RT bar</th>
              <th
                className="cursor-pointer select-none px-3 py-2 text-right hover:text-foreground"
                onClick={() => toggleSort("rt")}
                data-testid="sort-rt-col"
              >
                RT (ms) <SortIcon col="rt" />
              </th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2">Tags</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ trial, i, flags, response, timedOut, rt }) => {
              const hasFlagOrTimeout = flags.length > 0 || timedOut;
              const isExpanded = expandedRow === i;
              const isContextOpen = contextRow === i;
              const isFlashing = flashIndex === i;
              const annotation = sessionAnnotations?.[i];

              return (
                <>
                  <tr
                    key={i}
                    ref={(el) => setRowRef(i, el)}
                    className={`border-t border-border transition-colors ${hasFlagOrTimeout ? "bg-destructive/5" : ""} ${
                      flags.length > 0 ? "cursor-pointer hover:bg-muted/40" : ""
                    } ${isFlashing ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
                    onClick={() => flags.length > 0 && setExpandedRow(isExpanded ? null : i)}
                    data-testid={`stimulus-row-${i}`}
                  >
                    <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{trial.stimulus.word}</td>
                    <td className="px-3 py-2 text-foreground">
                      {hideResponses ? (
                        <span className="italic text-muted-foreground">—</span>
                      ) : response ? (
                        response
                      ) : (
                        <span className="italic text-muted-foreground">(empty)</span>
                      )}
                    </td>
                    <td className="w-24 px-3 py-2">
                      <RtBar rt={rt} minRt={minRt} maxRt={maxRt} />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-foreground">{rt}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {hasFlagOrTimeout ? (
                          <span className="text-xs text-destructive">
                            {timedOut && !flags.includes("timeout" as FlagKind) ? (
                              <span className="mr-1">timeout</span>
                            ) : null}
                            {flags.map((f) => FLAG_LABELS[f] ?? f).join(", ")}
                            {flags.length > 0 && (
                              <span className="ml-1 text-muted-foreground text-[10px]">
                                {isExpanded ? "▲" : "▼"}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                        {/* T0253: Context toggle */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setContextRow(isContextOpen ? null : i); }}
                          className="ml-1 rounded px-1 py-0.5 text-[9px] text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Show sequence context"
                        >
                          ctx
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-0.5">
                        {/* T0254: emotion badges */}
                        {annotation?.emotions?.map((em) => (
                          <span key={em} className="rounded bg-primary/10 px-1 py-0.5 text-[9px] text-primary">{em}</span>
                        ))}
                        {/* T0254: complex badges */}
                        {annotation?.candidateComplexes?.map((cx) => (
                          <span key={cx} className="rounded bg-accent/50 px-1 py-0.5 text-[9px] text-accent-foreground">{cx}</span>
                        ))}
                        {/* T0256: association type badges */}
                        {annotation?.associationTypes?.length ? (
                          <span className="rounded bg-secondary px-1 py-0.5 text-[9px] text-secondary-foreground" title={annotation.associationTypes.join(", ")}>
                            Type: {annotation.associationTypes.length}
                          </span>
                        ) : null}
                        {/* Self-tag badges */}
                        {annotation?.tags?.map((tag) => (
                          <span key={tag} className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-mono font-semibold text-primary">{tag}</span>
                        ))}
                        {!annotation?.emotions?.length && !annotation?.candidateComplexes?.length && !annotation?.tags?.length && !annotation?.associationTypes?.length && (
                          <span className="text-[9px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && flags.length > 0 && (
                    <tr key={`${i}-detail`} className="border-t border-border bg-muted/20">
                      <td colSpan={7} className="px-4 py-2">
                        <ul className="space-y-1">
                          {flags.map((flag) => (
                            <li key={flag} className="text-xs text-foreground">
                              <span className="font-semibold text-destructive mr-2">
                                {FLAG_LABELS[flag] ?? flag}:
                              </span>
                              {flagDetail(
                                flag,
                                trial.stimulus.word,
                                response,
                                rt,
                                rows.map((r) => ({ word: r.trial.stimulus.word, response: r.response, flags: r.flags })),
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                  {/* T0253: Context row */}
                  {isContextOpen && (
                    <tr key={`${i}-ctx`} className="border-t border-border bg-muted/10">
                      <td colSpan={7} className="px-4 py-2">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                          Sequence context (±2 trials)
                        </p>
                        <table className="w-full text-xs">
                          <tbody>
                            {getContextRows(i, trials, trialFlags, hideResponses).map((ctx) => (
                              <tr key={ctx.index} className={ctx.isCurrent ? "bg-primary/5 font-semibold" : ""}>
                                <td className="py-0.5 pr-2 font-mono text-muted-foreground">{ctx.index + 1}</td>
                                <td className="py-0.5 pr-2 text-foreground">{ctx.word}</td>
                                <td className="py-0.5 pr-2 text-foreground">{ctx.response || <span className="italic text-muted-foreground">(empty)</span>}</td>
                                <td className="py-0.5 text-right font-mono text-foreground">{ctx.rt}ms</td>
                                <td className="py-0.5 pl-2 text-destructive text-[10px]">
                                  {ctx.flags.length > 0 ? ctx.flags.map((f) => FLAG_LABELS[f] ?? f).join(", ") : ""}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            No rows match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}
