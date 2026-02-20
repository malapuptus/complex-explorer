/**
 * DemoSession — runs a word-association session with pack selection.
 * Autosaves draft after each scored trial; offers resume on reload.
 * T0247: mode support. T0248: Stop & Ground. T0249: debrief gate.
 */

declare const __APP_VERSION__: string;

import type { SessionResult, ProvenanceSnapshot, DraftSession, StimulusPackSnapshot, OrderPolicy } from "@/domain";
import { computeSessionFingerprint, getStimulusList, sessionTrialsToCsv } from "@/domain";
import { buildSessionContext } from "@/domain/sessionContext";
import { localStorageSessionStore, localStorageStimulusStore } from "@/infra";
import { useSession } from "./useSession";
import type { SessionSnapshot, StartOverrides } from "./useSession";
import { ResultsView } from "./ResultsView";
import { ProtocolScreen } from "./ProtocolScreen";
import type { AdvancedConfig, SessionMode } from "./ProtocolScreen";
import { ResumePrompt } from "./ResumePrompt";
import { RunningTrial } from "./RunningTrial";
import { DebriefScreen } from "./DebriefScreen";
import { generateId, generateTabId, PRACTICE_WORDS, DEFAULT_BREAK_EVERY } from "./DemoSessionHelpers";
import { usePackSelection } from "./usePackSelection";
import { useEffect, useRef, useState, useCallback } from "react";

/** Quota recovery dialog state. */
interface QuotaError {
  operation: "draft" | "session";
  message: string;
}

function QuotaRecoveryDialog({
  error, trials, trialFlags, csvMeta, onRetry, onDismiss,
}: {
  error: QuotaError;
  trials: { trial: unknown }[];
  trialFlags: unknown[];
  csvMeta: { sessionId: string; packId: string; packVersion: string; seed: number | null; sessionFingerprint: string | null };
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const [orphanResult, setOrphanResult] = useState<string | null>(null);

  const handleExport = () => {
    const csv = sessionTrialsToCsv(
      trials as never[], trialFlags as never[],
      csvMeta.sessionId, csvMeta.packId, csvMeta.packVersion,
      csvMeta.seed, csvMeta.sessionFingerprint, "scoring_v2_mad_3.5",
      { redactResponses: true },
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emergency-export-${csvMeta.sessionId}-redacted.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCleanup = async () => {
    const refs = await localStorageSessionStore.referencedPacks();
    const packs = localStorageStimulusStore.list();
    let deleted = 0;
    for (const p of packs) {
      if (!refs.has(`${p.id}@${p.version}`)) {
        localStorageStimulusStore.delete(p.id, p.version);
        deleted++;
      }
    }
    setOrphanResult(deleted > 0 ? `Deleted ${deleted} orphan pack(s).` : "No orphan packs found.");
  };

  return (
    <div className="mx-auto max-w-lg rounded-md border border-destructive bg-destructive/10 p-6 space-y-4" role="alertdialog" aria-labelledby="quota-title" aria-describedby="quota-desc">
      <h3 id="quota-title" className="text-lg font-bold text-destructive">Storage Full</h3>
      <p id="quota-desc" className="text-sm text-foreground">
        {error.operation === "draft" ? "Draft" : "Session"} could not be saved — browser storage quota exceeded.
      </p>
      <p className="text-xs text-muted-foreground">{error.message}</p>
      <div className="flex flex-wrap gap-3">
        <button onClick={handleExport}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Export CSV (Redacted)
        </button>
        <button onClick={handleCleanup}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
        >
          Delete orphan packs
        </button>
        <button onClick={onRetry}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          Retry save
        </button>
        <button onClick={onDismiss}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          Dismiss
        </button>
      </div>
      {orphanResult && <p className="text-xs text-muted-foreground">{orphanResult}</p>}
    </div>
  );
}

export function DemoSession() {
  const {
    packOptions, selectedPackKey, setSelectedPackKey,
    list, isLongPack, refreshPacks, resolveList, selectedOption,
  } = usePackSelection();

  const [activeConfig, setActiveConfig] = useState<AdvancedConfig | null>(null);
  const [onBreak, setOnBreak] = useState(false);
  const lastBreakAtRef = useRef(0);
  const [pendingDraft, setPendingDraft] = useState<DraftSession | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const [draftLocked, setDraftLocked] = useState(false);
  const [sessionFingerprint, setSessionFingerprint] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<QuotaError | null>(null);
  const draftIdRef = useRef(generateId());
  const tabIdRef = useRef(generateTabId());
  const startedAtRef = useRef<string | null>(null);
  /** T0247: session mode */
  const [sessionMode, setSessionMode] = useState<SessionMode>("exploration");
  /** T0249: debrief gate */
  const [debriefDone, setDebriefDone] = useState(false);

  const session = useSession(list.words as string[], {
    practiceWords: PRACTICE_WORDS,
  });
  const savedRef = useRef(false);

  const breakEveryN = activeConfig?.breakEveryN ?? DEFAULT_BREAK_EVERY;
  const orderPolicy = activeConfig?.orderPolicy ?? "fixed";

  // Check for existing draft on mount
  useEffect(() => {
    localStorageSessionStore.loadDraft().then((draft) => {
      if (draft) setPendingDraft(draft);
      setDraftChecked(true);
    });
  }, []);

  const buildDraft = useCallback((): DraftSession => ({
    id: draftIdRef.current,
    stimulusListId: list.id,
    stimulusListVersion: list.version,
    orderPolicy,
    seedUsed: session.seedUsed,
    wordList: list.words as string[],
    practiceWords: PRACTICE_WORDS,
    stimulusOrder: session.stimulusOrder,
    trials: session.trials,
    currentIndex: session.currentIndex,
    savedAt: new Date().toISOString(),
    startedAt: startedAtRef.current ?? undefined,
    trialTimeoutMs: session.trialTimeoutMs,
    breakEveryN,
  }), [list, orderPolicy, session, breakEveryN]);

  // Autosave draft after each trial during running phase
  const prevTrialCount = useRef(0);
  useEffect(() => {
    if (session.phase !== "running") return;
    if (session.trials.length === prevTrialCount.current) return;
    prevTrialCount.current = session.trials.length;

    const draft = buildDraft();
    try {
      localStorageSessionStore.saveDraft(draft);
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        setQuotaError({ operation: "draft", message: String(e.message) });
      }
    }
    localStorageSessionStore.acquireDraftLock(tabIdRef.current);
  }, [
    session.phase, session.trials, session.currentIndex,
    session.seedUsed, session.stimulusOrder, session.trialTimeoutMs,
    list, orderPolicy, breakEveryN, buildDraft,
  ]);

  // Clear draft when session completes
  useEffect(() => {
    if (session.phase !== "done" || !session.scoring || savedRef.current) return;
    savedRef.current = true;
    localStorageSessionStore.deleteDraft();
    localStorageSessionStore.releaseDraftLock(tabIdRef.current);

    const provSnapshot: ProvenanceSnapshot = {
      listId: list.id, listVersion: list.version,
      language: list.language, source: list.source,
      sourceName: list.provenance.sourceName,
      sourceYear: list.provenance.sourceYear,
      sourceCitation: list.provenance.sourceCitation,
      licenseNote: list.provenance.licenseNote,
      wordCount: list.words.length,
    };
    const config = {
      stimulusListId: list.id, stimulusListVersion: list.version,
      maxResponseTimeMs: 0, orderPolicy,
      seed: session.seedUsed, trialTimeoutMs: session.trialTimeoutMs,
      breakEveryN,
    };
    void (async () => {
      const fingerprint = await computeSessionFingerprint({
        config, stimulusOrder: session.stimulusOrder, seedUsed: session.seedUsed,
      });
      const appVer = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : null;
      let packHash: string | null = null;
      try {
        const { computeWordsSha256 } = await import("@/domain");
        packHash = await computeWordsSha256(list.words as string[]);
      } catch { /* hash unavailable */ }
      const packSnapshot: StimulusPackSnapshot = {
        stimulusListHash: packHash,
        stimulusSchemaVersion: "sp_v1",
        provenance: provSnapshot,
      };
      const sessionContext = buildSessionContext(session.trials);
      const result: SessionResult = {
        id: draftIdRef.current, config, trials: session.trials,
        startedAt: startedAtRef.current ?? new Date().toISOString(),
        completedAt: new Date().toISOString(),
        scoring: session.scoring, seedUsed: session.seedUsed,
        stimulusOrder: session.stimulusOrder,
        provenanceSnapshot: provSnapshot,
        sessionFingerprint: fingerprint,
        scoringVersion: "scoring_v2_mad_3.5",
        appVersion: appVer,
        stimulusPackSnapshot: packSnapshot,
        sessionContext,
      };
      try {
        await localStorageSessionStore.save(result);
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          setQuotaError({ operation: "session", message: String(e.message) });
        }
      }
      setSessionFingerprint(fingerprint);
    })();
  }, [
    session.phase, session.scoring, session.trials, list,
    orderPolicy, session.seedUsed, session.stimulusOrder,
    session.trialTimeoutMs, breakEveryN,
  ]);

  const handleRetryQuota = useCallback(() => {
    if (quotaError?.operation === "draft") {
      try {
        localStorageSessionStore.saveDraft(buildDraft());
        setQuotaError(null);
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          setQuotaError({ operation: "draft", message: String(e.message) });
        }
      }
    } else {
      setQuotaError(null);
    }
  }, [quotaError, buildDraft]);

  const handleResume = useCallback(() => {
    if (!pendingDraft) return;
    const acquired = localStorageSessionStore.acquireDraftLock(tabIdRef.current);
    if (!acquired) { setDraftLocked(true); return; }
    const draftList = resolveList(pendingDraft.stimulusListId, pendingDraft.stimulusListVersion);
    if (!draftList) {
      localStorageSessionStore.deleteDraft();
      setPendingDraft(null);
      return;
    }
    const allWords = [...pendingDraft.practiceWords, ...pendingDraft.stimulusOrder];
    const snapshot: SessionSnapshot = {
      words: allWords.map((word, index) => ({ word, index })),
      currentIndex: pendingDraft.currentIndex,
      trials: [...pendingDraft.trials],
      practiceCount: pendingDraft.practiceWords.length,
      seedUsed: pendingDraft.seedUsed,
      stimulusOrder: [...pendingDraft.stimulusOrder],
      trialTimeoutMs: pendingDraft.trialTimeoutMs,
    };
    startedAtRef.current = pendingDraft.startedAt ?? new Date().toISOString();
    draftIdRef.current = pendingDraft.id;
    setSelectedPackKey(`${pendingDraft.stimulusListId}@${pendingDraft.stimulusListVersion}`);
    setActiveConfig({
      orderPolicy: pendingDraft.orderPolicy,
      seed: pendingDraft.seedUsed,
      breakEveryN: pendingDraft.breakEveryN ?? DEFAULT_BREAK_EVERY,
      trialTimeoutMs: pendingDraft.trialTimeoutMs,
    });
    session.restore(snapshot);
    setPendingDraft(null);
  }, [pendingDraft, session, resolveList, setSelectedPackKey]);

  const handleDiscard = useCallback(() => {
    localStorageSessionStore.deleteDraft();
    localStorageSessionStore.releaseDraftLock(tabIdRef.current);
    setPendingDraft(null);
    setDraftLocked(false);
  }, []);

  const handleStart = useCallback((config: AdvancedConfig, mode: SessionMode) => {
    const acquired = localStorageSessionStore.acquireDraftLock(tabIdRef.current);
    if (!acquired) { setDraftLocked(true); return; }
    startedAtRef.current = new Date().toISOString();
    setActiveConfig(config);
    setSessionMode(mode);
    setDebriefDone(false);
    const overrides: StartOverrides = {
      orderPolicy: config.orderPolicy, seed: config.seed,
      trialTimeoutMs: config.trialTimeoutMs,
    };
    session.start(overrides);
  }, [session]);

  const handleReset = useCallback(() => {
    savedRef.current = false;
    lastBreakAtRef.current = 0;
    prevTrialCount.current = 0;
    draftIdRef.current = generateId();
    setOnBreak(false);
    setActiveConfig(null);
    setDraftLocked(false);
    setSessionFingerprint(null);
    setQuotaError(null);
    setDebriefDone(false);
    localStorageSessionStore.releaseDraftLock(tabIdRef.current);
    session.reset();
  }, [session]);

  const handleReproduce = useCallback((config: {
    packId: string; packVersion: string; seed: number | null;
    orderPolicy: OrderPolicy; trialTimeoutMs?: number; breakEveryN?: number;
  }) => {
    const packAvailable = resolveList(config.packId, config.packVersion);
    if (!packAvailable) {
      alert(`Pack "${config.packId}@${config.packVersion}" is not installed. Import it first to reproduce this session.`);
      return;
    }
    handleReset();
    setSelectedPackKey(`${config.packId}@${config.packVersion}`);
    const advConfig: AdvancedConfig = {
      orderPolicy: config.orderPolicy,
      seed: config.seed,
      breakEveryN: config.breakEveryN ?? DEFAULT_BREAK_EVERY,
      trialTimeoutMs: config.trialTimeoutMs,
    };
    setTimeout(() => handleStart(advConfig, sessionMode), 0);
  }, [resolveList, handleReset, setSelectedPackKey, handleStart, sessionMode]);

  // Release lock on unmount
  useEffect(() => {
    const tabId = tabIdRef.current;
    return () => { localStorageSessionStore.releaseDraftLock(tabId); };
  }, []);

  if (!draftChecked) return null;

  // Quota recovery overlay (0230)
  if (quotaError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <QuotaRecoveryDialog
          error={quotaError}
          trials={session.trials as never[]}
          trialFlags={session.scoring?.trialFlags ?? []}
          csvMeta={{
            sessionId: draftIdRef.current, packId: list.id,
            packVersion: list.version, seed: session.seedUsed,
            sessionFingerprint,
          }}
          onRetry={handleRetryQuota}
          onDismiss={() => setQuotaError(null)}
        />
      </div>
    );
  }

  if (pendingDraft && session.phase === "idle") {
    return (
      <ResumePrompt
        pendingDraft={pendingDraft} draftLocked={draftLocked}
        onResume={handleResume} onDiscard={handleDiscard}
      />
    );
  }

  if (session.phase === "idle") {
    return (
      <ProtocolScreen
        wordCount={list.words.length} practiceCount={PRACTICE_WORDS.length}
        source={list.source} estimatedMinutes={selectedOption.estimate}
        isLongPack={isLongPack} onReady={handleStart}
        onPackImported={refreshPacks} selectedPack={list}
        packOptions={packOptions}
        selectedPackKey={selectedPackKey}
        onPackKeyChange={setSelectedPackKey}
        notice={draftLocked ? (
          <p className="text-center text-sm text-destructive">
            A session is active in another tab. Close it or wait 2 minutes.
          </p>
        ) : undefined}
      />
    );
  }

  if (session.phase === "running" && session.currentWord) {
    return (
      <RunningTrial
        currentWord={session.currentWord} currentIndex={session.currentIndex}
        words={session.words} practiceCount={session.practiceCount}
        breakEveryN={breakEveryN} onBreak={onBreak} setOnBreak={setOnBreak}
        lastBreakAtRef={lastBreakAtRef} seedUsed={session.seedUsed}
        trialTimeoutMs={session.trialTimeoutMs}
        onSubmit={session.submitResponse} onTimeout={session.handleTimeout}
        sessionMode={sessionMode}
        onEndSession={handleReset}
      />
    );
  }

  // T0249: Debrief gate
  if (session.phase === "done" && session.scoring && !debriefDone) {
    return (
      <DebriefScreen onContinue={() => setDebriefDone(true)} />
    );
  }

  if (session.phase === "done" && session.scoring && debriefDone) {
    const scoredTrials = session.trials.filter((t) => !t.isPractice);
    return (
      <ResultsView
        trials={scoredTrials} trialFlags={session.scoring.trialFlags}
        meanReactionTimeMs={session.scoring.summary.meanReactionTimeMs}
        medianReactionTimeMs={session.scoring.summary.medianReactionTimeMs}
        onReset={handleReset}
        onReproduce={handleReproduce}
        sessionMode={sessionMode}
        csvMeta={{
          sessionId: draftIdRef.current, packId: list.id,
          packVersion: list.version, seed: session.seedUsed,
          sessionFingerprint, orderPolicy,
          trialTimeoutMs: activeConfig?.trialTimeoutMs,
          breakEveryN: isLongPack ? breakEveryN : undefined,
        }}
      />
    );
  }

  return null;
}
