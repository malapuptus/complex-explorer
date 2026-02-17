/**
 * ResultsDashboardPanel — 3-card summary + SVG charts + anomalies list.
 * Supports drilldown (0266) and quality card (0268).
 * Ticket 0265.
 */

import { useState, useMemo } from "react";
import type { SessionInsights, SessionContext } from "@/domain";
import { computeQualityIndex, getMicroGoal } from "@/domain";
import { RtTimeline, RtHistogram } from "./ResultsCharts";
import { TrialDetailPanel } from "./TrialDetailPanel";

interface Props {
  insights: SessionInsights;
  sessionContext?: SessionContext | null;
}

function StatRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs text-foreground${mono ? " font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function DashCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

export function ResultsDashboardPanel({ insights, sessionContext }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const deviceLabel = useMemo(() => {
    if (!sessionContext) return "unknown";
    const parts = [sessionContext.deviceClass, sessionContext.osFamily, sessionContext.browserFamily];
    return parts.every((p) => p === "unknown") ? "unknown" : parts.join(" · ");
  }, [sessionContext]);

  const qi = useMemo(() => computeQualityIndex(insights), [insights]);
  const microGoal = useMemo(() => getMicroGoal(insights), [insights]);

  const selectedRef = selectedIdx !== null
    ? (insights.trialRefBySessionTrialIndex[selectedIdx] ?? null)
    : null;

  const pct = (insights.nonEmptyResponseRate * 100).toFixed(1);

  return (
    <div className="mb-6 space-y-4">
      {/* 3 + 1 cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DashCard title="Response Quality">
          <StatRow label="Scored" value={insights.scoredCount} />
          <StatRow label="Empty" value={insights.emptyResponseCount} />
          <StatRow label="Timeouts" value={insights.timeoutCount} />
          <StatRow label="Flagged" value={insights.flaggedTrialCount} />
          <StatRow label="Non-empty rate" value={`${pct}%`} mono />
        </DashCard>

        <DashCard title="Speed Profile">
          <StatRow label="Median RT" value={`${insights.medianRtMs} ms`} mono />
          <StatRow label="p90 RT" value={`${insights.p90RtMs} ms`} mono />
          <StatRow label="Spikiness" value={`${insights.spikinessMs} ms`} mono />
          <StatRow label="Min" value={`${insights.minRtMs} ms`} mono />
          <StatRow label="Max" value={`${insights.maxRtMs} ms`} mono />
        </DashCard>

        <DashCard title="Input / Device">
          <StatRow label="IME used" value={insights.imeUsed ? "Yes" : "No"} />
          <StatRow label="Compositions" value={insights.totalCompositions} />
          <StatRow label="Backspaces" value={insights.totalBackspaces} />
          <StatRow label="Edits" value={insights.totalEdits} />
          <StatRow label="Device" value={deviceLabel} />
        </DashCard>

        <DashCard title="Session Quality">
          <div className="mb-1 flex items-end gap-1">
            <span className="text-2xl font-bold text-foreground">{qi.score}</span>
            <span className="mb-0.5 text-xs text-muted-foreground">/ 100</span>
          </div>
          {qi.penalties.slice(0, 3).map((p) => (
            <div key={p.reason} className="flex justify-between py-0.5">
              <span className="text-xs text-muted-foreground">{p.reason}</span>
              <span className="text-xs font-mono text-destructive">−{p.points}</span>
            </div>
          ))}
          {qi.penalties.length === 0 && (
            <p className="text-xs text-muted-foreground">Perfect score 🎉</p>
          )}
          <p className="mt-2 text-[11px] italic text-muted-foreground">{microGoal}</p>
        </DashCard>
      </div>

      {/* Charts */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">RT Timeline</p>
        <RtTimeline
          points={insights.timeline}
          onPointClick={(idx) => setSelectedIdx(idx)}
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">RT Distribution</p>
        <RtHistogram histogram={insights.histogram} />
      </div>

      {/* Anomalies */}
      {insights.topSlowTrials.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Top Slow Trials</p>
          <ul className="divide-y divide-border rounded-md border border-border text-xs">
            {insights.topSlowTrials.map((ref) => (
              <li
                key={ref.sessionTrialIndex}
                data-session-trial-index={ref.sessionTrialIndex}
                onClick={() => setSelectedIdx(ref.sessionTrialIndex)}
                className="flex cursor-pointer items-center justify-between px-3 py-1.5 hover:bg-muted"
              >
                <span className="font-medium text-foreground">{ref.word}</span>
                <span className="font-mono text-muted-foreground">{ref.reactionTimeMs} ms</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Drilldown dialog */}
      <TrialDetailPanel
        trialRef={selectedRef}
        onClose={() => setSelectedIdx(null)}
      />
    </div>
  );
}
