/**
 * StimulusTable — T0242: per-stimulus results table with sort + flagged filter.
 * T0243: flag detail expansion with response/stimulus, hide-responses toggle.
 */

import { useState, useMemo } from "react";
import type { Trial, TrialFlag, FlagKind } from "@/domain";
import { getResponseText, getTimedOut } from "@/domain";
import { RtBar } from "./ResultsTableControls";

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  minRt: number;
  maxRt: number;
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

export function StimulusTable({ trials, trialFlags, minRt, maxRt }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [hideResponses, setHideResponses] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const rows = useMemo(() => {
    return trials.map((trial, i) => {
      const flags = (trialFlags[i]?.flags ?? []) as FlagKind[];
      const response = getResponseText(trial);
      const timedOut = getTimedOut(trial, flags as string[]);
      return { trial, i, flags, response, timedOut, rt: trial.association.reactionTimeMs };
    });
  }, [trials, trialFlags]);

  const filtered = useMemo(() => {
    return flaggedOnly ? rows.filter((r) => r.flags.length > 0 || r.timedOut) : rows;
  }, [rows, flaggedOnly]);

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
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ trial, i, flags, response, timedOut, rt }) => {
              const hasFlagOrTimeout = flags.length > 0 || timedOut;
              const isExpanded = expandedRow === i;

              return (
                <>
                  <tr
                    key={i}
                    className={`border-t border-border ${hasFlagOrTimeout ? "bg-destructive/5" : ""} ${
                      flags.length > 0 ? "cursor-pointer hover:bg-muted/40" : ""
                    }`}
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
                    </td>
                  </tr>
                  {isExpanded && flags.length > 0 && (
                    <tr key={`${i}-detail`} className="border-t border-border bg-muted/20">
                      <td colSpan={6} className="px-4 py-2">
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
