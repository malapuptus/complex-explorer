/**
 * DemoSession — runs a word-association session with pack selection.
 * Autosaves draft after each scored trial; offers resume on reload.
 */

import { getStimulusList, listAvailableStimulusLists } from "@/domain";
import type {
  SessionResult,
  OrderPolicy,
  ProvenanceSnapshot,
  DraftSession,
} from "@/domain";
import { localStorageSessionStore } from "@/infra";
import { useSession } from "./useSession";
import type { SessionSnapshot } from "./useSession";
import { TrialView } from "./TrialView";
import { ResultsView } from "./ResultsView";
import { ProtocolScreen } from "./ProtocolScreen";
import { BreakScreen } from "./BreakScreen";
import { useEffect, useRef, useState, useCallback } from "react";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PRACTICE_WORDS = ["sun", "table", "road"];
const BREAK_EVERY = 20;

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
  const [orderPolicy, setOrderPolicy] = useState<OrderPolicy>("fixed");
  const [onBreak, setOnBreak] = useState(false);
  const lastBreakAtRef = useRef(0);
  const [pendingDraft, setPendingDraft] = useState<DraftSession | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const draftIdRef = useRef(generateId());

  const selectedOption = packOptions.find(
    (p) => `${p.id}@${p.version}` === selectedPackKey,
  )!;
  const list = getStimulusList(selectedOption.id, selectedOption.version)!;

  const session = useSession(list.words as string[], {
    practiceWords: PRACTICE_WORDS,
    orderPolicy,
  });
  const savedRef = useRef(false);

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

    // Only autosave after scored trials (skip practice-only updates
    // for very small overhead, but save anyway for safety)
    const draft: DraftSession = {
      id: draftIdRef.current,
      stimulusListId: list.id,
      stimulusListVersion: list.version,
      orderPolicy,
      seedUsed: session.seedUsed,
      wordList: list.words as string[],
      practiceWords: PRACTICE_WORDS,
      trials: session.trials,
      currentIndex: session.currentIndex,
      savedAt: new Date().toISOString(),
    };
    localStorageSessionStore.saveDraft(draft);
  }, [
    session.phase,
    session.trials,
    session.currentIndex,
    session.seedUsed,
    list,
    orderPolicy,
  ]);

  // Clear draft when session completes
  useEffect(() => {
    if (session.phase === "done" && session.scoring && !savedRef.current) {
      savedRef.current = true;
      localStorageSessionStore.deleteDraft();
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
      const result: SessionResult = {
        id: draftIdRef.current,
        config: {
          stimulusListId: list.id,
          stimulusListVersion: list.version,
          maxResponseTimeMs: 0,
          orderPolicy,
          seed: session.seedUsed,
        },
        trials: session.trials,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        scoring: session.scoring,
        seedUsed: session.seedUsed,
        stimulusOrder: session.stimulusOrder,
        provenanceSnapshot: provSnapshot,
      };
      localStorageSessionStore.save(result);
    }
  }, [
    session.phase,
    session.scoring,
    session.trials,
    list,
    orderPolicy,
    session.seedUsed,
    session.stimulusOrder,
  ]);

  const handleResume = useCallback(() => {
    if (!pendingDraft) return;
    const draftList = getStimulusList(
      pendingDraft.stimulusListId,
      pendingDraft.stimulusListVersion,
    );
    if (!draftList) {
      // Pack no longer exists — discard
      localStorageSessionStore.deleteDraft();
      setPendingDraft(null);
      return;
    }

    // Rebuild the word list as StimulusWord[]
    const allWords = [
      ...pendingDraft.practiceWords,
      ...pendingDraft.wordList,
    ];
    const snapshot: SessionSnapshot = {
      words: allWords.map((word, index) => ({ word, index })),
      currentIndex: pendingDraft.currentIndex,
      trials: [...pendingDraft.trials],
      practiceCount: pendingDraft.practiceWords.length,
      seedUsed: pendingDraft.seedUsed,
      stimulusOrder: pendingDraft.wordList as string[],
      trialTimeoutMs: session.trialTimeoutMs,
    };

    draftIdRef.current = pendingDraft.id;
    setSelectedPackKey(
      `${pendingDraft.stimulusListId}@${pendingDraft.stimulusListVersion}`,
    );
    setOrderPolicy(pendingDraft.orderPolicy);
    session.restore(snapshot);
    setPendingDraft(null);
  }, [pendingDraft, session]);

  const handleDiscard = useCallback(() => {
    localStorageSessionStore.deleteDraft();
    setPendingDraft(null);
  }, []);

  const handleReset = () => {
    savedRef.current = false;
    lastBreakAtRef.current = 0;
    prevTrialCount.current = 0;
    draftIdRef.current = generateId();
    setOnBreak(false);
    session.reset();
  };

  // Wait for draft check before rendering
  if (!draftChecked) return null;

  // Show resume prompt if draft exists and session is idle
  if (pendingDraft && session.phase === "idle") {
    const scoredDone = pendingDraft.trials.filter(
      (t) => !t.isPractice,
    ).length;
    const savedDate = new Date(pendingDraft.savedAt);
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
        <h2 className="text-2xl font-bold text-foreground">
          Resume Session?
        </h2>
        <div className="max-w-md space-y-2 text-center">
          <p className="text-muted-foreground">
            You have an unfinished session from{" "}
            <strong className="text-foreground">
              {savedDate.toLocaleString()}
            </strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Pack: {pendingDraft.stimulusListId} · {scoredDone} words
            completed
          </p>
        </div>
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

  if (session.phase === "idle") {
    return (
      <ProtocolScreen
        wordCount={list.words.length}
        practiceCount={PRACTICE_WORDS.length}
        source={list.source}
        estimatedMinutes={selectedOption.estimate}
        onReady={session.start}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">
              Stimulus pack:
            </label>
            <select
              value={selectedPackKey}
              onChange={(e) => setSelectedPackKey(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
            >
              {packOptions.map((p) => (
                <option
                  key={`${p.id}@${p.version}`}
                  value={`${p.id}@${p.version}`}
                >
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">
              Word order:
            </label>
            <select
              value={orderPolicy}
              onChange={(e) =>
                setOrderPolicy(e.target.value as OrderPolicy)
              }
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
            >
              <option value="fixed">Fixed</option>
              <option value="seeded">Randomized</option>
            </select>
          </div>
        </div>
      </ProtocolScreen>
    );
  }

  if (session.phase === "running" && session.currentWord) {
    const isPractice = session.currentIndex < session.practiceCount;
    const scoredCompleted = isPractice
      ? 0
      : session.currentIndex - session.practiceCount;
    const totalScored = session.words.length - session.practiceCount;

    if (
      !isPractice &&
      scoredCompleted > 0 &&
      scoredCompleted % BREAK_EVERY === 0 &&
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
      !isPractice &&
      scoredCompleted > 0 &&
      scoredCompleted % BREAK_EVERY === 0 &&
      scoredCompleted !== lastBreakAtRef.current &&
      !onBreak
    ) {
      setOnBreak(true);
    }

    return (
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
    );
  }

  if (session.phase === "done" && session.scoring) {
    const scoredTrials = session.trials.filter((t) => !t.isPractice);
    return (
      <ResultsView
        trials={scoredTrials}
        trialFlags={session.scoring.trialFlags}
        meanReactionTimeMs={session.scoring.summary.meanReactionTimeMs}
        medianReactionTimeMs={
          session.scoring.summary.medianReactionTimeMs
        }
        onReset={handleReset}
      />
    );
  }

  return null;
}
