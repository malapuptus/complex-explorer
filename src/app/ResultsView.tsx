import { useMemo, useCallback, useState, useEffect } from "react";
import type { Trial, TrialFlag, OrderPolicy, SessionResult, StimulusPackSnapshot, CiCode, FlagKind } from "@/domain";
import { generateReflectionPrompts, getStimulusList, buildSessionInsights, getResponseText, getTimedOut } from "@/domain";
import { localStorageStimulusStore, localStorageSessionStore, uiPrefs, trialAnnotations } from "@/infra";
import { SessionSummaryCard } from "./SessionSummaryCard";
import { ExportActions, SCORING_VERSION, APP_VERSION } from "./ResultsExportActions";
import { ResultsDashboardPanel } from "./ResultsDashboardPanel";
import { SessionsDrawer } from "./SessionsDrawer";
import { ResultsTableControls, RtBar, rowMatchesFilter } from "./ResultsTableControls";
import type { FilterChip } from "./ResultsTableControls";
import { HomeBar } from "./HomeBar";
import { StimulusTable } from "./StimulusTable";
import { RecallRun, RecallSummary } from "./RecallRun";
import type { RecallResult } from "./RecallRun";
import { StopGroundDialog } from "./StopGroundDialog";
import { CiSummaryPanel } from "./CiSummaryPanel";
import { InterpretationGuidePanel } from "./InterpretationGuidePanel";
import { ComplexWorkbookPanel } from "./ComplexWorkbookPanel";
import type { SessionMode } from "./ProtocolScreen";



interface Props {
  trials: Trial[];
  trialFlags: TrialFlag[];
  meanReactionTimeMs: number;
  medianReactionTimeMs: number;
  onReset: () => void;
  onReproduce?: (config: {
    packId: string;
    packVersion: string;
    seed: number | null;
    orderPolicy: OrderPolicy;
    trialTimeoutMs?: number;
    breakEveryN?: number;
  }) => void;
  sessionResult?: SessionResult;
  sessionMode?: SessionMode;
  csvMeta?: {
    sessionId: string;
    packId: string;
    packVersion: string;
    seed: number | null;
    sessionFingerprint?: string | null;
    orderPolicy?: OrderPolicy;
    trialTimeoutMs?: number;
    breakEveryN?: number;
    stimulusListHash?: string | null;
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.body.removeChild(el);
    }
  }, [text]);
  return (
    <button onClick={handleCopy} className="ml-2 rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function ResultsView({
  trials, trialFlags, meanReactionTimeMs, medianReactionTimeMs,
  onReset, onReproduce, sessionResult, sessionMode, csvMeta,
}: Props) {
  const reflectionPrompts = useMemo(
    () => generateReflectionPrompts(trials, trialFlags),
    [trials, trialFlags],
  );

  const persistedSnapshot: StimulusPackSnapshot | null = useMemo(() => {
    if (sessionResult?.stimulusPackSnapshot) return sessionResult.stimulusPackSnapshot;
    if (csvMeta?.stimulusListHash) {
      return {
        stimulusListHash: csvMeta.stimulusListHash,
        stimulusSchemaVersion: null,
        provenance: sessionResult?.provenanceSnapshot ?? null,
      };
    }
    return null;
  }, [sessionResult, csvMeta]);

  const packIsInstalled = useMemo(() => {
    if (!csvMeta) return false;
    if (getStimulusList(csvMeta.packId, csvMeta.packVersion)) return true;
    return localStorageStimulusStore.exists(csvMeta.packId, csvMeta.packVersion);
  }, [csvMeta]);

  const reproBundle = useMemo(() => {
    if (!csvMeta) return null;
    const lines = [
      `Fingerprint: ${csvMeta.sessionFingerprint ?? "n/a"}`,
      `Pack: ${csvMeta.packId}@${csvMeta.packVersion}`,
      `Seed: ${csvMeta.seed ?? "none"}`,
      `Order: ${csvMeta.orderPolicy ?? "unknown"}`,
      `Scoring: ${SCORING_VERSION}`,
    ];
    if (csvMeta.trialTimeoutMs !== undefined) lines.push(`Timeout: ${csvMeta.trialTimeoutMs}ms`);
    if (csvMeta.breakEveryN !== undefined) lines.push(`Break every: ${csvMeta.breakEveryN}`);
    return lines.join("\n");
  }, [csvMeta]);

  // 0264/0265: Session insights for dashboard
  const insights = useMemo(
    () => sessionResult ? buildSessionInsights(sessionResult) : null,
    [sessionResult],
  );

  // 0267: Baseline compare
  const [baselineId, setBaselineId] = useState<string | null>(() => uiPrefs.getBaselineSessionId());
  const [baseline, setBaseline] = useState<SessionResult | null>(null);
  const [baselineNotFound, setBaselineNotFound] = useState(false);

  const handleMarkBaseline = useCallback(() => {
    if (!sessionResult) return;
    const newId = sessionResult.id === baselineId ? null : sessionResult.id;
    uiPrefs.setBaselineSessionId(newId);
    setBaselineId(newId);
    if (!newId) { setBaseline(null); setBaselineNotFound(false); }
  }, [sessionResult, baselineId]);

  const handleClearBaseline = useCallback(() => {
    uiPrefs.setBaselineSessionId(null);
    setBaselineId(null);
    setBaseline(null);
    setBaselineNotFound(false);
  }, []);

  useEffect(() => {
    if (!baselineId || baselineId === sessionResult?.id) {
      setBaseline(null); setBaselineNotFound(false);
      return;
    }
    localStorageSessionStore.load(baselineId).then((s) => {
      if (s) { setBaseline(s); setBaselineNotFound(false); }
      else { setBaseline(null); setBaselineNotFound(true); }
    });
  }, [baselineId, sessionResult?.id]);

  const baselineInsights = useMemo(
    () => baseline ? buildSessionInsights(baseline) : null,
    [baseline],
  );

  const showCompare = baseline !== null && baseline.id !== sessionResult?.id
    && baselineInsights !== null && insights !== null;

  // 0274: Comparability check (same pack + same order)
  const isComparable = useMemo(() => {
    if (!baseline || !sessionResult || !baselineInsights || !insights) return false;
    const samePackId = sessionResult.config.stimulusListId === baseline.config.stimulusListId;
    const samePackVersion = sessionResult.config.stimulusListVersion === baseline.config.stimulusListVersion;
    const sameOrder = JSON.stringify(sessionResult.stimulusOrder) === JSON.stringify(baseline.stimulusOrder);
    return samePackId && samePackVersion && sameOrder;
  }, [baseline, sessionResult, baselineInsights, insights]);

  // 0273: Table filter/search state
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // 0278: CI filter state
  const [activeCiCode, setActiveCiCode] = useState<CiCode | null>(null);
  // 0283: Layout toggle (Overview = charts first; Details = table)
  const [layout, setLayout] = useState<"overview" | "details">("overview");
  // 0284: Filter history for back-navigation
  const [filterHistory, setFilterHistory] = useState<FilterChip[]>([]);
  // 0284: Active flag filter (driven from chart clicks)
  const [activeFlagFilter, setActiveFlagFilter] = useState<FlagKind | null>(null);
  // 0284: Cluster-filtered trial indices (null = no cluster filter)
  const [clusterIndices, setClusterIndices] = useState<Set<number> | null>(null);
  // T0248: Stop & Ground
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [recallPhase, setRecallPhase] = useState<"idle" | "running" | "done">("idle");
  const [recallResults, setRecallResults] = useState<RecallResult[]>([]);
  // T0253: jump-to-trial from CI panel
  const [stimTableHighlight, setStimTableHighlight] = useState<number | null>(null);
  // T0255: candidate complex filter
  const [activeComplexFilter, setActiveComplexFilter] = useState<string | null>(null);

  // Session annotations for T0254/T0255
  const sessionAnnotations = useMemo(
    () => sessionResult ? trialAnnotations.getSessionAnnotations(sessionResult.id) : {},
    [sessionResult],
  );

  // T0254: Collect all existing candidate complex labels for TrialDetailPanel reuse
  const existingComplexLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const ann of Object.values(sessionAnnotations)) {
      for (const cx of (ann.candidateComplexes ?? [])) labels.add(cx);
    }
    return [...labels].sort();
  }, [sessionAnnotations]);

  // 0284: Chart → filter bridge
  const handleFlagFilter = useCallback((flag: FlagKind | null) => {
    setFilterHistory((h) => [...h, activeFilter]);
    setActiveFlagFilter(flag);
    setClusterIndices(null);
    // Map flag to FilterChip where possible
    if (flag === "timing_outlier_slow") { setActiveFilter("timing_outlier_slow"); }
    else if (flag === "timing_outlier_fast") { setActiveFilter("timing_outlier_fast"); }
    else if (flag === "repeated_response") { setActiveFilter("repeated_response"); }
    else if (flag === "empty_response") { setActiveFilter("empty"); }
    else if (flag === "timeout") { setActiveFilter("timeout"); }
    else if (flag === null) { setActiveFilter("all"); }
    setLayout("details");
  }, [activeFilter]);

  const handleClusterFilter = useCallback((indices: number[]) => {
    setFilterHistory((h) => [...h, activeFilter]);
    setClusterIndices(new Set(indices));
    setActiveFlagFilter(null);
    setLayout("details");
  }, [activeFilter]);

  const handleBackFilter = useCallback(() => {
    const prev = filterHistory[filterHistory.length - 1] ?? "all";
    setFilterHistory((h) => h.slice(0, -1));
    setActiveFilter(prev);
    setActiveFlagFilter(null);
    setClusterIndices(null);
    setActiveCiCode(null);
  }, [filterHistory]);


  // T0245: Recall run derived data
  const recallWords = useMemo(() => trials.map((t) => t.stimulus.word), [trials]);
  const recallOriginal = useMemo(() => trials.map((t) => getResponseText(t)), [trials]);

  // T0245: Show recall screens instead of results
  if (recallPhase === "running") {
    return (
      <RecallRun
        words={recallWords}
        originalResponses={recallOriginal}
        onComplete={(results) => { setRecallResults(results); setRecallPhase("done"); }}
        onCancel={() => setRecallPhase("idle")}
      />
    );
  }
  if (recallPhase === "done") {
    return (
      <RecallSummary
        results={recallResults}
        onDone={() => setRecallPhase("idle")}
      />
    );
  }

  return (
    <>
    <HomeBar />
    <div className="mx-auto max-w-3xl px-4 py-8 pt-12">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-foreground">Session Results</h2>
          {/* T0247: mode badge */}
          {sessionMode && (
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              sessionMode === "exploration"
                ? "bg-primary/10 text-primary"
                : "bg-accent text-accent-foreground"
            }`}>
              {sessionMode === "exploration" ? "Exploration" : "Research"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* T0248: Stop & Ground */}
          <button
            type="button"
            onClick={() => setStopDialogOpen(true)}
            className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Stop &amp; Ground
          </button>
          {/* Baseline indicator */}
          {baselineId && baselineId === sessionResult?.id && (
            <span
              data-testid="baseline-set-indicator"
              className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
            >
              Baseline: {sessionResult.id.slice(0, 8)}…
            </span>
          )}
          {sessionResult && (
            <button
              onClick={handleMarkBaseline}
              className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {baselineId === sessionResult.id ? "Baseline ✓" : "Mark as baseline"}
            </button>
          )}
          <SessionsDrawer />
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Mean RT: {meanReactionTimeMs} ms &middot; Median RT: {medianReactionTimeMs} ms
      </p>

      {/* T0250: Complex Indicators panel */}
      <div className="mb-6">
        <CiSummaryPanel
          trials={trials}
          trialFlags={trialFlags}
          onJumpToTrial={(idx) => { setStimTableHighlight(idx); setLayout("details"); }}
        />
      </div>

      {/* T0252: Interpretation Guide */}
      <div className="mb-6">
        <InterpretationGuidePanel sessionMode={sessionMode} />
      </div>

      {/* T0255: Complex Workbook */}
      <div className="mb-6">
        <ComplexWorkbookPanel
          sessionAnnotations={sessionAnnotations}
          activeComplex={activeComplexFilter}
          onComplexFilter={setActiveComplexFilter}
        />
      </div>

      {/* 0283: Layout toggle */}
      {insights && (
        <div className="mb-4 flex items-center gap-1" data-testid="layout-toggle">
          <button
            data-testid="layout-overview-btn"
            onClick={() => setLayout("overview")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              layout === "overview"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Overview
          </button>
          <button
            data-testid="layout-details-btn"
            onClick={() => setLayout("details")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              layout === "details"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            Details
          </button>
        </div>
      )}

      {/* 0265/0271: Insights Dashboard (Overview mode) */}
      {insights && layout === "overview" && (
        <>
          <h3
            data-testid="insights-dashboard-heading"
            className="mb-3 text-sm font-semibold text-foreground"
          >
            Insights Dashboard
          </h3>
          <ResultsDashboardPanel
            insights={insights}
            sessionContext={sessionResult?.sessionContext ?? null}
            baselineInsights={baselineInsights}
            sessionId={sessionResult?.id}
            onFlagFilter={handleFlagFilter}
            onCiFilter={(code) => { setActiveCiCode(code); setLayout("details"); }}
            onChartFilter={handleClusterFilter}
            activeFlag={activeFlagFilter}
            activeCiCode={activeCiCode}
          />
        </>
      )}


      {/* 0267: Baseline not found */}
      {baselineNotFound && (
        <div className="mb-4 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Baseline not found — </span>
          <button onClick={handleClearBaseline} className="text-primary underline">clear baseline</button>
        </div>
      )}

      {/* 0267: Compare card */}
      {showCompare && baselineInsights && (
        <div className="mb-6 rounded-md border border-border bg-muted/30 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Compare to baseline</h3>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            {[
              { label: "Median RT", delta: insights!.medianRtMs - baselineInsights.medianRtMs, unit: "ms" },
              { label: "Empty", delta: insights!.emptyResponseCount - baselineInsights.emptyResponseCount, unit: "" },
              { label: "Timeouts", delta: insights!.timeoutCount - baselineInsights.timeoutCount, unit: "" },
              { label: "Flagged", delta: insights!.flaggedTrialCount - baselineInsights.flaggedTrialCount, unit: "" },
            ].map(({ label, delta, unit }) => (
              <div key={label} className="rounded-md border border-border bg-card p-2">
                <p className="text-muted-foreground">{label}</p>
                <p className={`font-mono font-semibold ${delta > 0 ? "text-destructive" : delta < 0 ? "text-green-600" : "text-foreground"}`}>
                  {delta > 0 ? `+${delta}` : delta}{unit}
                </p>
              </div>
            ))}
          </div>
          {(() => {
            const cur = new Set(insights!.topSlowTrials.map((r) => r.word));
            const bas = new Set(baselineInsights.topSlowTrials.map((r) => r.word));
            const overlap = [...cur].filter((w) => bas.has(w)).length;
            return <p className="mt-2 text-xs text-muted-foreground">Spike overlap: {overlap}/{Math.min(5, cur.size)} slow words match baseline</p>;
          })()}
        </div>
      )}

      {csvMeta && reproBundle && (
        <div className="mb-6 rounded-md border border-border bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Reproducibility Bundle</h3>
            <CopyButton text={reproBundle} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Fingerprint</dt>
            <dd className="font-mono text-foreground break-all">{csvMeta.sessionFingerprint ?? "n/a"}</dd>
            <dt className="text-muted-foreground">Pack</dt>
            <dd className="text-foreground">{csvMeta.packId}@{csvMeta.packVersion}</dd>
            <dt className="text-muted-foreground">Seed</dt>
            <dd className="font-mono text-foreground">{csvMeta.seed ?? "none"}</dd>
            <dt className="text-muted-foreground">Order</dt>
            <dd className="text-foreground">{csvMeta.orderPolicy ?? "unknown"}</dd>
            <dt className="text-muted-foreground">Scoring</dt>
            <dd className="font-mono text-foreground">{SCORING_VERSION}</dd>
            <dt className="text-muted-foreground">
              {sessionResult?.appVersion ? "Saved app version" : APP_VERSION ? "Current app version (fallback)" : "App version"}
            </dt>
            <dd className="font-mono text-foreground">
              {sessionResult?.appVersion ?? APP_VERSION ?? "unknown (legacy)"}
            </dd>
            {persistedSnapshot && (
              <>
                <dt className="text-muted-foreground">Pack hash</dt>
                <dd className="font-mono text-foreground break-all">{persistedSnapshot.stimulusListHash ?? "n/a"}</dd>
                <dt className="text-muted-foreground">Pack schema</dt>
                <dd className="font-mono text-foreground">{persistedSnapshot.stimulusSchemaVersion ?? "n/a"}</dd>
              </>
            )}
            {csvMeta.trialTimeoutMs !== undefined && (
              <><dt className="text-muted-foreground">Timeout</dt><dd className="text-foreground">{csvMeta.trialTimeoutMs}ms</dd></>
            )}
            {csvMeta.breakEveryN !== undefined && (
              <><dt className="text-muted-foreground">Break every</dt><dd className="text-foreground">{csvMeta.breakEveryN} trials</dd></>
            )}
            {sessionResult?.importedFrom && (
              <>
                <dt className="text-muted-foreground">Imported from</dt>
                <dd className="font-mono text-foreground">{sessionResult.importedFrom.packageVersion}</dd>
                <dt className="text-muted-foreground">Package hash</dt>
                <dd className="font-mono text-foreground break-all">
                  {sessionResult.importedFrom.packageHash.slice(0, 16)}…
                </dd>
                {sessionResult.importedFrom.originalSessionId && (
                  <>
                    <dt className="text-muted-foreground">Original session id</dt>
                    <dd className="font-mono text-foreground break-all">
                      {sessionResult.importedFrom.originalSessionId}
                    </dd>
                  </>
                )}
              </>
            )}
          </dl>
        </div>
      )}

      {csvMeta && (
        <div className="mb-6">
          <SessionSummaryCard
            trials={trials} trialFlags={trialFlags}
            meanReactionTimeMs={meanReactionTimeMs} medianReactionTimeMs={medianReactionTimeMs}
            sessionResult={sessionResult} csvMeta={csvMeta}
          />
        </div>
      )}

      {/* 0283: Details mode — table with controls. Also always show heading for tests. */}
      {insights && layout === "details" && (
        <h3
          data-testid="insights-dashboard-heading"
          className="sr-only"
        >
          Insights Dashboard
        </h3>
      )}
      {/* 0273 + 0278 + 0283 + 0284: Table controls with CI filter (Details mode) */}
      {layout === "details" && (() => {
        const minRt = insights?.minRtMs ?? 0;
        const maxRt = insights?.maxRtMs ?? 1;
        const sessionAnnotations = sessionResult
          ? trialAnnotations.getSessionAnnotations(sessionResult.id)
          : {};

        // 0284: cluster filter overrides normal filter
        const filteredRows = trials.map((trial, i) => {
          const flags = trialFlags[i]?.flags ?? [];
          const response = getResponseText(trial);
          const timedOut = getTimedOut(trial, flags as string[]);
          const trialCiCodes = insights?.ciByTrial.get(i) ?? [];
          let matches: boolean;
          if (clusterIndices !== null) {
            // Cluster filter: show only trials in the cluster set
            matches = clusterIndices.has(i);
            // Also apply search
            if (searchQuery.trim()) {
              const q = searchQuery.trim().toLowerCase();
              matches = matches && (
                trial.stimulus.word.toLowerCase().includes(q) ||
                response.toLowerCase().includes(q)
              );
            }
          } else {
            matches = rowMatchesFilter(
              trial.stimulus.word,
              response,
              flags,
              timedOut,
              activeFilter,
              searchQuery,
              activeCiCode,
              trialCiCodes,
            );
          }
          return { trial, i, flags, response, timedOut, trialCiCodes, matches };
        });
        const visibleRows = filteredRows.filter((r) => r.matches);

        return (
          <>
            {/* 0284: Back button when filter was activated from chart */}
            {(clusterIndices !== null || activeFlagFilter !== null) && filterHistory.length > 0 && (
              <div className="mb-2 flex items-center gap-2">
                <button
                  data-testid="filter-back-btn"
                  onClick={handleBackFilter}
                  className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  ← Back
                </button>
                <span className="text-xs text-muted-foreground">
                  {clusterIndices !== null
                    ? `Showing ${clusterIndices.size} trials from cluster`
                    : `Filtered by: ${activeFlagFilter}`}
                </span>
              </div>
            )}
            <ResultsTableControls
              totalCount={trials.length}
              visibleCount={visibleRows.length}
              activeFilter={activeFilter}
              searchQuery={searchQuery}
              onFilterChange={(f) => { setActiveFilter(f); setClusterIndices(null); setActiveFlagFilter(null); }}
              onSearchChange={setSearchQuery}
              activeCiCode={activeCiCode}
              onCiCodeChange={setActiveCiCode}
              ciCounts={insights?.ciCounts}
            />

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Stimulus</th>
                    <th className="px-3 py-2">Response</th>
                    <th className="px-3 py-2 text-right">RT bar</th>
                    <th className="px-3 py-2 text-right">1st Key</th>
                    <th className="px-3 py-2 text-right">Submit</th>
                    <th className="px-3 py-2 text-right">BS</th>
                    {/* 0274: ΔRT column when comparable */}
                    {isComparable && <th className="px-3 py-2 text-right">ΔRT</th>}
                    <th className="px-3 py-2">Flags / Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ trial, i, flags, response, timedOut }) => {
                    const a = trial.association;
                    // 0274: per-trial ΔRT when comparable
                    const baselineRef = isComparable && baselineInsights
                      ? baselineInsights.trialRefBySessionTrialIndex[i] ?? null
                      : null;
                    const deltaRt = baselineRef !== null
                      ? a.reactionTimeMs - baselineRef.reactionTimeMs
                      : null;
                    // 0279: annotation badges
                    const annotation = sessionAnnotations[i];
                    const annotationTags = annotation?.tags ?? [];

                    return (
                      <tr key={i} className={`border-t border-border ${flags.length > 0 ? "bg-destructive/5" : ""}`}>
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-foreground">{trial.stimulus.word}</td>
                        <td className="px-3 py-2 text-foreground">
                          {response || <span className="italic text-muted-foreground">(empty)</span>}
                        </td>
                        <td className="w-24 px-3 py-2">
                          <RtBar rt={a.reactionTimeMs} minRt={minRt} maxRt={maxRt} />
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">
                          {a.tFirstKeyMs !== null ? a.tFirstKeyMs : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{a.reactionTimeMs}</td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{a.backspaceCount}</td>
                        {isComparable && (
                          <td className={`px-3 py-2 text-right font-mono text-xs ${deltaRt === null ? "text-muted-foreground" : deltaRt > 0 ? "text-destructive" : deltaRt < 0 ? "text-green-600" : "text-foreground"}`}>
                            {deltaRt !== null ? (deltaRt > 0 ? `+${deltaRt}` : `${deltaRt}`) : "—"}
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {flags.length > 0
                              ? <span className="text-xs text-destructive">{flags.join(", ")}</span>
                              : <span className="text-xs text-muted-foreground">—</span>}
                            {/* 0279: self-tag badges */}
                            {annotationTags.map((tag) => (
                              <span
                                key={tag}
                                data-testid={`annotation-badge-${tag}`}
                                className="rounded bg-primary/15 px-1 py-0.5 text-[10px] font-mono font-semibold text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 0274: Non-comparable note */}
            {showCompare && !isComparable && (
              <p className="mt-1 text-xs text-muted-foreground italic">
                Baseline compare requires same pack + same order.
              </p>
            )}
          </>
        );
      })()}

      {/* T0242/T0243: Stimulus Table — always visible below the main view */}
      {insights && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Stimulus Table</h3>
          <StimulusTable
            trials={trials}
            trialFlags={trialFlags}
            minRt={insights.minRtMs}
            maxRt={insights.maxRtMs}
            highlightIndex={stimTableHighlight}
            sessionAnnotations={sessionAnnotations}
            complexFilter={activeComplexFilter}
          />
        </div>
      )}

      {reflectionPrompts.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-lg font-semibold text-foreground">Explore Further</h3>
          <p className="mb-4 text-xs text-muted-foreground italic">
            These prompts are for personal reflection only — they are not diagnostic and do not indicate any condition.
          </p>
          <ul className="space-y-3">
            {reflectionPrompts.map((rp, i) => (
              <li key={i} className="rounded-md border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm text-foreground">{rp.prompt}</p>
                <p className="mt-1 text-xs text-muted-foreground">Signal: {rp.flag.replace(/_/g, " ")}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* T0245: Recall Run entry point */}
      {trials.length > 0 && (
        <div className="mt-6 rounded-md border border-border bg-muted/20 px-4 py-4">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Recall Run — Optional</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            See the same words again without time pressure, then compare your responses to this session.
            For personal reflection only — not diagnostic.
          </p>
          <button
            data-testid="start-recall-btn"
            onClick={() => setRecallPhase("running")}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            Start Recall Run
          </button>
        </div>
      )}

      {csvMeta && (
        <ExportActions
          trials={trials} trialFlags={trialFlags}
          meanReactionTimeMs={meanReactionTimeMs} medianReactionTimeMs={medianReactionTimeMs}
          sessionResult={sessionResult} csvMeta={csvMeta}
          persistedSnapshot={persistedSnapshot} packIsInstalled={packIsInstalled}
          onReproduce={onReproduce} onReset={onReset}
        />
      )}
      {!csvMeta && (
        <div className="mt-6">
          <button onClick={onReset} className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90">
            Start Over
          </button>
        </div>
      )}
    </div>

    <StopGroundDialog
      open={stopDialogOpen}
      onOpenChange={setStopDialogOpen}
      onResume={() => {}}
      onEnd={() => { window.location.href = "/"; }}
      showTimingWarning={sessionMode === "research"}
    />
    </>
  );
}
