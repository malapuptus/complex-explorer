/**
 * SessionComparePanel — T0259: Compare two sessions side-by-side.
 * T0263: Mismatched pack warning, stable signals, require-same-mode toggle.
 */

import { useMemo, useState } from "react";
import type { SessionResult, FlagKind } from "@/domain";
import { buildSessionInsights, getResponseText } from "@/domain";
import { trialAnnotations } from "@/infra";

interface Props {
  sessionA: SessionResult;
  sessionB: SessionResult;
  onBack: () => void;
}

function intersect<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

function sessionBadge(s: SessionResult) {
  const pack = `${s.config.stimulusListId}@${s.config.stimulusListVersion}`;
  const date = new Date(s.completedAt).toLocaleDateString();
  return { pack, date, id: s.id.slice(0, 8) };
}

export function SessionComparePanel({ sessionA, sessionB, onBack }: Props) {
  const [requireSameMode, setRequireSameMode] = useState(false);

  const insightsA = useMemo(() => buildSessionInsights(sessionA), [sessionA]);
  const insightsB = useMemo(() => buildSessionInsights(sessionB), [sessionB]);

  const badgeA = sessionBadge(sessionA);
  const badgeB = sessionBadge(sessionB);

  // T0263: Pack mismatch detection
  const samePack = sessionA.config.stimulusListId === sessionB.config.stimulusListId
    && sessionA.config.stimulusListVersion === sessionB.config.stimulusListVersion;

  // T0263: Mode detection (best-effort from sessionContext or config)
  const modeA = (sessionA as unknown as Record<string, unknown>).sessionMode as string | undefined;
  const modeB = (sessionB as unknown as Record<string, unknown>).sessionMode as string | undefined;
  const sameMode = modeA === modeB || (!modeA && !modeB);
  const modeBlocked = requireSameMode && !sameMode;

  // Flag counts
  const flagCountsA = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tf of sessionA.scoring.trialFlags) {
      for (const f of tf.flags) counts[f] = (counts[f] || 0) + 1;
    }
    return counts;
  }, [sessionA]);

  const flagCountsB = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tf of sessionB.scoring.trialFlags) {
      for (const f of tf.flags) counts[f] = (counts[f] || 0) + 1;
    }
    return counts;
  }, [sessionB]);

  const allFlagTypes = [...new Set([...Object.keys(flagCountsA), ...Object.keys(flagCountsB)])].sort();

  // Shared flagged stimuli (by text intersection)
  const flaggedWordsA = useMemo(() => {
    const words = new Set<string>();
    sessionA.trials.forEach((t, i) => {
      if ((sessionA.scoring.trialFlags[i]?.flags.length ?? 0) > 0) words.add(t.stimulus.word);
    });
    return [...words];
  }, [sessionA]);

  const flaggedWordsB = useMemo(() => {
    const words = new Set<string>();
    sessionB.trials.forEach((t, i) => {
      if ((sessionB.scoring.trialFlags[i]?.flags.length ?? 0) > 0) words.add(t.stimulus.word);
    });
    return [...words];
  }, [sessionB]);

  const sharedFlaggedStimuli = intersect(flaggedWordsA, flaggedWordsB);

  // Shared repeated responses
  const responsesA = useMemo(() => sessionA.trials.map((t) => getResponseText(t)).filter(Boolean), [sessionA]);
  const responsesB = useMemo(() => sessionB.trials.map((t) => getResponseText(t)).filter(Boolean), [sessionB]);

  const repeatedA = useMemo(() => {
    const counts: Record<string, number> = {};
    responsesA.forEach((r) => { counts[r] = (counts[r] || 0) + 1; });
    return Object.keys(counts).filter((r) => counts[r] > 1);
  }, [responsesA]);

  const repeatedB = useMemo(() => {
    const counts: Record<string, number> = {};
    responsesB.forEach((r) => { counts[r] = (counts[r] || 0) + 1; });
    return Object.keys(counts).filter((r) => counts[r] > 1);
  }, [responsesB]);

  const sharedRepeatedResponses = intersect(repeatedA, repeatedB);

  // Shared candidate complex labels
  const complexLabelsA = useMemo(() => {
    const labels = new Set<string>();
    const anns = trialAnnotations.getSessionAnnotations(sessionA.id);
    for (const ann of Object.values(anns)) {
      for (const cx of (ann.candidateComplexes ?? [])) labels.add(cx);
    }
    return [...labels];
  }, [sessionA.id]);

  const complexLabelsB = useMemo(() => {
    const labels = new Set<string>();
    const anns = trialAnnotations.getSessionAnnotations(sessionB.id);
    for (const ann of Object.values(anns)) {
      for (const cx of (ann.candidateComplexes ?? [])) labels.add(cx);
    }
    return [...labels];
  }, [sessionB.id]);

  const sharedComplexLabels = intersect(complexLabelsA, complexLabelsB);

  // T0263: Shared association types
  const assocTypesA = useMemo(() => {
    const types = new Set<string>();
    const anns = trialAnnotations.getSessionAnnotations(sessionA.id);
    for (const ann of Object.values(anns)) {
      for (const at of (ann.associationTypes ?? [])) types.add(at);
    }
    return [...types];
  }, [sessionA.id]);

  const assocTypesB = useMemo(() => {
    const types = new Set<string>();
    const anns = trialAnnotations.getSessionAnnotations(sessionB.id);
    for (const ann of Object.values(anns)) {
      for (const at of (ann.associationTypes ?? [])) types.add(at);
    }
    return [...types];
  }, [sessionB.id]);

  const sharedAssocTypes = intersect(assocTypesA, assocTypesB);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to sessions
      </button>

      <h2 className="text-xl font-bold text-foreground">Compare Sessions</h2>

      {/* T0263: Pack mismatch warning */}
      {!samePack && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3" data-testid="pack-mismatch-warning">
          <p className="text-xs font-semibold text-destructive">⚠ Different packs — overlap is approximate</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            These sessions used different stimulus packs. Shared stimuli are computed by word text intersection only.
          </p>
        </div>
      )}

      {/* T0263: Require same mode toggle */}
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={requireSameMode}
          onChange={(e) => setRequireSameMode(e.target.checked)}
          className="h-3 w-3 rounded border-border"
        />
        Require same mode
      </label>

      {modeBlocked && (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            These sessions used different modes. Uncheck "Require same mode" or compare sessions with matching modes.
          </p>
        </div>
      )}

      {!modeBlocked && (
        <>
          {/* Session badges */}
          <div className="grid grid-cols-2 gap-3">
            {[badgeA, badgeB].map((b, idx) => (
              <div key={idx} className="rounded-md border border-border p-3">
                <p className="text-xs font-semibold text-foreground">Session {idx + 1}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{b.id}</p>
                <p className="text-xs text-muted-foreground">{b.pack}</p>
                <p className="text-xs text-muted-foreground">{b.date}</p>
              </div>
            ))}
          </div>

          {/* Flag counts comparison */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Flag Counts</h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Flag</th>
                    <th className="px-3 py-1.5 text-right">Session 1</th>
                    <th className="px-3 py-1.5 text-right">Session 2</th>
                  </tr>
                </thead>
                <tbody>
                  {allFlagTypes.map((flag) => (
                    <tr key={flag} className="border-t border-border">
                      <td className="px-3 py-1.5 text-foreground">{flag.replace(/_/g, " ")}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-foreground">{flagCountsA[flag] ?? 0}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-foreground">{flagCountsB[flag] ?? 0}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border font-semibold">
                    <td className="px-3 py-1.5 text-foreground">Median RT</td>
                    <td className="px-3 py-1.5 text-right font-mono text-foreground">{insightsA.medianRtMs} ms</td>
                    <td className="px-3 py-1.5 text-right font-mono text-foreground">{insightsB.medianRtMs} ms</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* T0263: Stable Signals */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Stable Signals</h3>
            <p className="text-[10px] text-muted-foreground mb-2">
              Items that appear consistently across both sessions — stronger evidence of meaningful patterns.
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Stimuli flagged in both sessions ({sharedFlaggedStimuli.length})
                </p>
                {sharedFlaggedStimuli.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {sharedFlaggedStimuli.map((w) => (
                      <span key={w} className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive font-medium">
                        {w}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">No shared flagged stimuli.</p>
                )}
              </div>

              {sharedComplexLabels.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Complex labels in both sessions ({sharedComplexLabels.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sharedComplexLabels.map((cx) => (
                      <span key={cx} className="rounded-full bg-accent/50 px-2 py-0.5 text-[10px] text-accent-foreground font-medium">
                        {cx}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {sharedAssocTypes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Association types in both sessions ({sharedAssocTypes.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sharedAssocTypes.map((at) => (
                      <span key={at} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                        {at}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Overlap summary */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Overlap Summary</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Shared repeated responses ({sharedRepeatedResponses.length})
                </p>
                {sharedRepeatedResponses.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {sharedRepeatedResponses.map((r) => (
                      <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                        {r}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">No shared repeated responses.</p>
                )}
              </div>
            </div>
          </div>

          {/* Session context */}
          {(sessionA.sessionContext || sessionB.sessionContext) && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Session Context</h3>
              <div className="grid grid-cols-2 gap-3">
                {[sessionA, sessionB].map((s, idx) => (
                  <div key={idx} className="rounded-md border border-border p-3 space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground">Session {idx + 1}</p>
                    {s.sessionContext ? (
                      <>
                        <p className="text-xs text-foreground">Device: {s.sessionContext.deviceClass}</p>
                        <p className="text-xs text-muted-foreground">OS: {s.sessionContext.osFamily}</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">No context data</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
