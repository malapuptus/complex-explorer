/**
 * DemoSession — runs a word-association session with pack selection.
 * Autosaves draft after each scored trial; offers resume on reload.
 */

declare const __APP_VERSION__: string;

import type { SessionResult, ProvenanceSnapshot, DraftSession, StimulusPackSnapshot, OrderPolicy } from "@/domain";
import { computeSessionFingerprint, getStimulusList } from "@/domain";
import { localStorageSessionStore } from "@/infra";
import { useSession } from "./useSession";
import type { SessionSnapshot, StartOverrides } from "./useSession";
import { ResultsView } from "./ResultsView";
import { ProtocolScreen } from "./ProtocolScreen";
import type { AdvancedConfig } from "./ProtocolScreen";
import { ResumePrompt } from "./ResumePrompt";
import { RunningTrial } from "./RunningTrial";
import { generateId, generateTabId, PRACTICE_WORDS, DEFAULT_BREAK_EVERY } from "./DemoSessionHelpers";
import { usePackSelection } from "./usePackSelection";
import { useEffect, useRef, useState, useCallback } from "react";

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
  const draftIdRef = useRef(generateId());
  const tabIdRef = useRef(generateTabId());
  const startedAtRef = useRef<string | null>(null);

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

  // Autosave draft after each trial during running phase
  const prevTrialCount = useRef(0);
  useEffect(() => {
    if (session.phase !== "running") return;
    if (session.trials.length === prevTrialCount.current) return;
    prevTrialCount.current = session.trials.length;

    const draft: DraftSession = {
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
    };
    localStorageSessionStore.saveDraft(draft);
    localStorageSessionStore.acquireDraftLock(tabIdRef.current);
  }, [
    session.phase, session.trials, session.currentIndex,
    session.seedUsed, session.stimulusOrder, session.trialTimeoutMs,
    list, orderPolicy, breakEveryN,
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
      };
      localStorageSessionStore.save(result);
      setSessionFingerprint(fingerprint);
    })();
  }, [
    session.phase, session.scoring, session.trials, list,
    orderPolicy, session.seedUsed, session.stimulusOrder,
    session.trialTimeoutMs, breakEveryN,
  ]);

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

  const handleStart = useCallback((config: AdvancedConfig) => {
    const acquired = localStorageSessionStore.acquireDraftLock(tabIdRef.current);
    if (!acquired) { setDraftLocked(true); return; }
    startedAtRef.current = new Date().toISOString();
    setActiveConfig(config);
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
    setTimeout(() => handleStart(advConfig), 0);
  }, [resolveList, handleReset, setSelectedPackKey, handleStart]);

  // Release lock on unmount
  useEffect(() => {
    const tabId = tabIdRef.current;
    return () => { localStorageSessionStore.releaseDraftLock(tabId); };
  }, []);

  if (!draftChecked) return null;

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
      >
        {draftLocked && (
          <p className="text-center text-sm text-destructive">
            A session is active in another tab. Close it or wait 2 minutes.
          </p>
        )}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Stimulus pack:</label>
            <select
              value={selectedPackKey}
              onChange={(e) => setSelectedPackKey(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
            >
              {packOptions.map((p) => (
                <option key={`${p.id}@${p.version}`} value={`${p.id}@${p.version}`}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ProtocolScreen>
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
      />
    );
  }

  if (session.phase === "done" && session.scoring) {
    const scoredTrials = session.trials.filter((t) => !t.isPractice);
    return (
      <ResultsView
        trials={scoredTrials} trialFlags={session.scoring.trialFlags}
        meanReactionTimeMs={session.scoring.summary.meanReactionTimeMs}
        medianReactionTimeMs={session.scoring.summary.medianReactionTimeMs}
        onReset={handleReset}
        onReproduce={handleReproduce}
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
