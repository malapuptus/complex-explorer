/**
 * ReportView — T0265: Print-friendly single-page report view.
 * Designed for browser Print → Save as PDF.
 */

import { useMemo } from "react";
import type { Trial, TrialFlag, SessionResult, FlagKind } from "@/domain";
import { buildSessionInsights, getResponseText } from "@/domain";
import { trialAnnotations } from "@/infra";
import type { SessionMode } from "./ProtocolScreen";

interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  sessionResult?: SessionResult;
  sessionMode?: SessionMode;
  onClose: () => void;
}

const FLAG_LABELS: Record<string, string> = {
  timing_outlier_slow: "Slow outlier",
  timing_outlier_fast: "Fast outlier",
  empty_response: "Empty response",
  repeated_response: "Repeated response",
  high_editing: "High editing",
  timeout: "Timed out",
};

export function ReportView({ trials, trialFlags, sessionResult, sessionMode, onClose }: Props) {
  const insights = useMemo(
    () => sessionResult ? buildSessionInsights(sessionResult) : null,
    [sessionResult],
  );

  const flaggedItems = useMemo(() => {
    const items: Array<{ index: number; word: string; rt: number; flags: FlagKind[] }> = [];
    for (let i = 0; i < trials.length; i++) {
      const flags = (trialFlags[i]?.flags ?? []) as FlagKind[];
      if (flags.length > 0) {
        items.push({ index: i, word: trials[i].stimulus.word, rt: trials[i].association.reactionTimeMs, flags });
      }
    }
    return items;
  }, [trials, trialFlags]);

  const annotations = useMemo(
    () => sessionResult ? trialAnnotations.getSessionAnnotations(sessionResult.id) : {},
    [sessionResult],
  );

  // Complex workbook groups
  const complexGroups = useMemo(() => {
    const groups: Record<string, number[]> = {};
    for (const [idxStr, ann] of Object.entries(annotations)) {
      for (const cx of (ann.candidateComplexes ?? [])) {
        if (!groups[cx]) groups[cx] = [];
        groups[cx].push(Number(idxStr));
      }
    }
    return groups;
  }, [annotations]);

  const date = sessionResult?.completedAt
    ? new Date(sessionResult.completedAt).toLocaleString()
    : new Date().toLocaleString();

  const packLabel = sessionResult
    ? `${sessionResult.config.stimulusListId}@${sessionResult.config.stimulusListVersion}`
    : "Unknown pack";

  return (
    <div className="print:p-0 mx-auto max-w-3xl px-4 py-6 space-y-6" data-testid="report-view">
      {/* No-print control bar */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to results
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Header */}
      <header className="border-b border-border pb-4">
        <h1 className="text-xl font-bold text-foreground">Session Report</h1>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{date}</span>
          <span>{packLabel}</span>
          {sessionMode && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-semibold">
              {sessionMode === "exploration" ? "Exploration" : "Research"}
            </span>
          )}
          {sessionResult?.id && (
            <span className="font-mono">{sessionResult.id.slice(0, 12)}…</span>
          )}
        </div>
      </header>

      {/* Summary stats */}
      {insights && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Summary</h2>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-md border border-border p-2">
              <p className="text-muted-foreground">Median RT</p>
              <p className="font-mono font-semibold text-foreground">{insights.medianRtMs} ms</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-muted-foreground">Flagged</p>
              <p className="font-mono font-semibold text-foreground">{insights.flaggedTrialCount}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-muted-foreground">Empty</p>
              <p className="font-mono font-semibold text-foreground">{insights.emptyResponseCount}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="text-muted-foreground">Timeouts</p>
              <p className="font-mono font-semibold text-foreground">{insights.timeoutCount}</p>
            </div>
          </div>
        </section>
      )}

      {/* CI Summary */}
      {flaggedItems.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Flagged Trials ({flaggedItems.length})</h2>
          <table className="w-full text-xs border border-border">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left">#</th>
                <th className="px-2 py-1 text-left">Stimulus</th>
                <th className="px-2 py-1 text-left">Response</th>
                <th className="px-2 py-1 text-right">RT</th>
                <th className="px-2 py-1 text-left">Flags</th>
              </tr>
            </thead>
            <tbody>
              {flaggedItems.map((item) => (
                <tr key={item.index} className="border-t border-border">
                  <td className="px-2 py-1 font-mono text-muted-foreground">{item.index + 1}</td>
                  <td className="px-2 py-1 text-foreground">{item.word}</td>
                  <td className="px-2 py-1 text-muted-foreground italic">hidden</td>
                  <td className="px-2 py-1 text-right font-mono text-foreground">{item.rt}</td>
                  <td className="px-2 py-1 text-destructive">
                    {item.flags.map((f) => FLAG_LABELS[f] ?? f).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Complex Workbook */}
      {Object.keys(complexGroups).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Complex Workbook</h2>
          <div className="space-y-2">
            {Object.entries(complexGroups).sort(([a], [b]) => a.localeCompare(b)).map(([label, indices]) => (
              <div key={label} className="rounded-md border border-border p-2">
                <p className="text-xs font-semibold text-foreground">{label} ({indices.length} trials)</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {indices.sort((a, b) => a - b).map((idx) => (
                    <span key={idx} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      #{idx + 1} {trials[idx]?.stimulus.word}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Debrief context */}
      {sessionResult?.sessionContext && (
        <section>
          <h2 className="text-sm font-semibold text-foreground mb-2">Session Context</h2>
          <p className="text-xs text-muted-foreground">
            Device: {sessionResult.sessionContext.deviceClass} · OS: {sessionResult.sessionContext.osFamily}
          </p>
        </section>
      )}

      {/* Print hint */}
      <footer className="border-t border-border pt-3 text-center print:hidden">
        <p className="text-xs text-muted-foreground">
          Use your browser's Print function (Ctrl/Cmd + P) to save as PDF.
        </p>
      </footer>
    </div>
  );
}
