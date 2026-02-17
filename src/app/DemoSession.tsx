/**
 * DemoSession — runs a word-association session with pack selection.
 * Autosaves draft after each scored trial; offers resume on reload.
 */

import { getStimulusList, listAvailableStimulusLists, computeSessionFingerprint } from "@/domain";
import type { SessionResult, ProvenanceSnapshot, DraftSession } from "@/domain";
import { localStorageSessionStore } from "@/infra";
import { useSession } from "./useSession";
import type { SessionSnapshot, StartOverrides } from "./useSession";
import { TrialView } from "./TrialView";
import { ResultsView } from "./ResultsView";
import { ProtocolScreen } from "./ProtocolScreen";
import type { AdvancedConfig } from "./ProtocolScreen";
import { BreakScreen } from "./BreakScreen";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PRACTICE_WORDS = ["sun", "table", "road"];
const DEFAULT_BREAK_EVERY = 20;

interface PackOption {
  id: string;
  version: string;
  label: string;
  wordCount: number;
  estimate: string;
}

function buildPackOptions(): PackOption[] {
  return listAvailableStimulusLists().map((meta) => ({
    id: meta.id,
    version: meta.version,
    label:
      meta.id === "demo-10"
        ? `Demo (${meta.wordCount} words)`
        : `${meta.source} (${meta.wordCount} words)`,
    wordCount: meta.wordCount,
    estimate: estimateDuration(meta.wordCount),
  }));
}

function estimateDuration(wordCount: number): string {
  const loMin = Math.max(1, Math.round((wordCount * 3) / 60));
  const hiMin = Math.max(1, Math.round((wordCount * 7) / 60));
  if (loMin === hiMin) return `~${loMin} min`;
  return `~${loMin}–${hiMin} min`;
}

export function DemoSession() {
  const packOptions = useRef(buildPackOptions()).current;
  const [selectedPackKey, setSelectedPackKey] = useState(
    `${packOptions[0].id}@${packOptions[0].version}`,
  );
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

  const selectedOption = packOptions.find((p) => `${p.id}@${p.version}` === selectedPackKey)!;
  const list = getStimulusList(selectedOption.id, selectedOption.version)!;
  const isLongPack = list.words.length > 10;

  const session = useSession(list.words as string[], {
    practiceWords: PRACTICE_WORDS,
  });
  const savedRef = useRef(false);

  const breakEveryN = activeConfig?.breakEveryN ?? DEFAULT_BREAK_EVERY;
  const orderPolicy = activeConfig?.orderPolicy ?? "fixed";

  // Check for existing draft on mount
  useEffect(() => {
    localStorageSessionStore.loadDraft().then((draft) => {
      if (draft) {
        setPendingDraft(draft);
      }
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
    // Refresh lock TTL on each autosave
    localStorageSessionStore.acquireDraftLock(tabIdRef.current);
  }, [
    session.phase,
    session.trials,
    session.currentIndex,
    session.seedUsed,
    session.stimulusOrder,
    session.trialTimeoutMs,
    list,
    orderPolicy,
    breakEveryN,
  ]);

  // Clear draft when session completes
  useEffect(() => {
    if (session.phase === "done" && session.scoring && !savedRef.current) {
      savedRef.current = true;
      localStorageSessionStore.deleteDraft();
      localStorageSessionStore.releaseDraftLock(tabIdRef.current);
      const provSnapshot: ProvenanceSnapshot = {
        listId: list.id,
        listVersion: list.version,
        language: list.language,
        source: list.source,
        sourceName: list.provenance.sourceName,
        sourceYear: list.provenance.sourceYear,
        sourceCitation: list.provenance.sourceCitation,
        licenseNote: list.provenance.licenseNote,
        wordCount: list.words.length,
      };
      const config = {
        stimulusListId: list.id,
        stimulusListVersion: list.version,
        maxResponseTimeMs: 0,
        orderPolicy,
        seed: session.seedUsed,
        trialTimeoutMs: session.trialTimeoutMs,
        breakEveryN,
      };
      void (async () => {
        const fingerprint = await computeSessionFingerprint({
          config,
          stimulusOrder: session.stimulusOrder,
          seedUsed: session.seedUsed,
        });
        const result: SessionResult = {
          id: draftIdRef.current,
          config,
          trials: session.trials,
          startedAt: startedAtRef.current ?? new Date().toISOString(),
          completedAt: new Date().toISOString(),
          scoring: session.scoring,
          seedUsed: session.seedUsed,
          stimulusOrder: session.stimulusOrder,
          provenanceSnapshot: provSnapshot,
          sessionFingerprint: fingerprint,
          scoringVersion: "scoring_v2_mad_3.5",
        };
        localStorageSessionStore.save(result);
        setSessionFingerprint(fingerprint);
      })();
    }
  }, [
    session.phase,
    session.scoring,
    session.trials,
    list,
    orderPolicy,
    session.seedUsed,
    session.stimulusOrder,
    session.trialTimeoutMs,
    breakEveryN,
  ]);

  const handleResume = useCallback(() => {
    if (!pendingDraft) return;

    // Acquire lock before resuming
    const acquired = localStorageSessionStore.acquireDraftLock(tabIdRef.current);
    if (!acquired) {
      setDraftLocked(true);
      return;
    }
    const draftList = getStimulusList(
      pendingDraft.stimulusListId,
      pendingDraft.stimulusListVersion,
    );
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
  }, [pendingDraft, session]);

  const handleDiscard = useCallback(() => {
    localStorageSessionStore.deleteDraft();
    localStorageSessionStore.releaseDraftLock(tabIdRef.current);
    setPendingDraft(null);
    setDraftLocked(false);
  }, []);

  const handleStart = useCallback(
    (config: AdvancedConfig) => {
      // Acquire lock before starting
      const acquired = localStorageSessionStore.acquireDraftLock(tabIdRef.current);
      if (!acquired) {
        setDraftLocked(true);
        return;
      }
      startedAtRef.current = new Date().toISOString();
      setActiveConfig(config);
      const overrides: StartOverrides = {
        orderPolicy: config.orderPolicy,
        seed: config.seed,
        trialTimeoutMs: config.trialTimeoutMs,
      };
      session.start(overrides);
    },
    [session],
  );

  const handleReset = () => {
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
  };

  // Release lock on unmount
  useEffect(() => {
    const tabId = tabIdRef.current;
    return () => {
      localStorageSessionStore.releaseDraftLock(tabId);
    };
  }, []);

  if (!draftChecked) return null;

  // Resume prompt
  if (pendingDraft && session.phase === "idle") {
    const scoredDone = pendingDraft.trials.filter((t) => !t.isPractice).length;
    const savedDate = new Date(pendingDraft.savedAt);
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
        <h2 className="text-2xl font-bold text-foreground">Resume Session?</h2>
        <div className="max-w-md space-y-2 text-center">
          <p className="text-muted-foreground">
            You have an unfinished session from{" "}
            <strong className="text-foreground">{savedDate.toLocaleString()}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Pack: {pendingDraft.stimulusListId} · {scoredDone} words completed
            {pendingDraft.seedUsed !== null && <> · Seed: {pendingDraft.seedUsed}</>}
          </p>
        </div>
        {draftLocked && (
          <p className="max-w-md text-center text-sm text-destructive">
            A session is active in another tab. Close it or wait 2 minutes.
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleResume}
            className="rounded-md bg-primary px-6 py-2 text-primary-foreground hover:opacity-90"
          >
            Resume
          </button>
          <button
            onClick={handleDiscard}
            className="rounded-md border border-border px-6 py-2 text-foreground hover:bg-muted"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  // Protocol / config screen
  if (session.phase === "idle") {
    return (
      <ProtocolScreen
        wordCount={list.words.length}
        practiceCount={PRACTICE_WORDS.length}
        source={list.source}
        estimatedMinutes={selectedOption.estimate}
        isLongPack={isLongPack}
        onReady={handleStart}
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

  // Running phase
  if (session.phase === "running" && session.currentWord) {
    const isPractice = session.currentIndex < session.practiceCount;
    const scoredCompleted = isPractice ? 0 : session.currentIndex - session.practiceCount;
    const totalScored = session.words.length - session.practiceCount;

    // Break logic (only when breakEveryN > 0)
    if (
      breakEveryN > 0 &&
      !isPractice &&
      scoredCompleted > 0 &&
      scoredCompleted % breakEveryN === 0 &&
      scoredCompleted !== lastBreakAtRef.current &&
      onBreak
    ) {
      return (
        <BreakScreen
          completedScored={scoredCompleted}
          totalScored={totalScored}
          onContinue={() => {
            lastBreakAtRef.current = scoredCompleted;
            setOnBreak(false);
          }}
        />
      );
    }

    if (
      breakEveryN > 0 &&
      !isPractice &&
      scoredCompleted > 0 &&
      scoredCompleted % breakEveryN === 0 &&
      scoredCompleted !== lastBreakAtRef.current &&
      !onBreak
    ) {
      setOnBreak(true);
    }

    // Show seedUsed banner on first scored trial
    const showSeedBanner = session.seedUsed !== null && scoredCompleted === 0 && !isPractice;

    return (
      <div className="flex flex-col items-center">
        {showSeedBanner && (
          <p className="mb-2 text-xs text-muted-foreground">Seed: {session.seedUsed}</p>
        )}
        <TrialView
          word={session.currentWord.word}
          index={session.currentIndex}
          total={session.words.length}
          isPractice={isPractice}
          practiceCount={session.practiceCount}
          trialTimeoutMs={session.trialTimeoutMs}
          onSubmit={session.submitResponse}
          onTimeout={session.handleTimeout}
        />
      </div>
    );
  }

  if (session.phase === "done" && session.scoring) {
    const scoredTrials = session.trials.filter((t) => !t.isPractice);
    return (
      <ResultsView
        trials={scoredTrials}
        trialFlags={session.scoring.trialFlags}
        meanReactionTimeMs={session.scoring.summary.meanReactionTimeMs}
        medianReactionTimeMs={session.scoring.summary.medianReactionTimeMs}
        onReset={handleReset}
        csvMeta={{
          sessionId: draftIdRef.current,
          packId: list.id,
          packVersion: list.version,
          seed: session.seedUsed,
          sessionFingerprint,
          orderPolicy,
          trialTimeoutMs: activeConfig?.trialTimeoutMs,
          breakEveryN: isLongPack ? breakEveryN : undefined,
        }}
      />
    );
  }

  return null;
}
