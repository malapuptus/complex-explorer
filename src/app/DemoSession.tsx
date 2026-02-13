/**
 * DemoSession — runs a word-association session with pack selection.
 * Saves completed sessions via SessionStore adapter.
 */

import { getStimulusList, listAvailableStimulusLists } from "@/domain";
import type { SessionResult, OrderPolicy, ProvenanceSnapshot } from "@/domain";
import { localStorageSessionStore } from "@/infra";
import { useSession } from "./useSession";
import { TrialView } from "./TrialView";
import { ResultsView } from "./ResultsView";
import { ProtocolScreen } from "./ProtocolScreen";
import { BreakScreen } from "./BreakScreen";
import { useEffect, useRef, useState } from "react";

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

/** Rough duration estimate: 3–7 s per word on average. */
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

  const selectedOption = packOptions.find(
    (p) => `${p.id}@${p.version}` === selectedPackKey,
  )!;
  const list = getStimulusList(selectedOption.id, selectedOption.version)!;

  const session = useSession(list.words as string[], {
    practiceWords: PRACTICE_WORDS,
    orderPolicy,
  });
  const savedRef = useRef(false);

  useEffect(() => {
    if (session.phase === "done" && session.scoring && !savedRef.current) {
      savedRef.current = true;
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
        id: generateId(),
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

  const handleReset = () => {
    savedRef.current = false;
    lastBreakAtRef.current = 0;
    setOnBreak(false);
    session.reset();
  };

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
                <option key={`${p.id}@${p.version}`} value={`${p.id}@${p.version}`}>
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
              onChange={(e) => setOrderPolicy(e.target.value as OrderPolicy)}
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

    // Check if we should show a break
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

    // Trigger break on next render when boundary is hit
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
        onSubmit={session.submitResponse}
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
        medianReactionTimeMs={session.scoring.summary.medianReactionTimeMs}
        onReset={handleReset}
      />
    );
  }

  return null;
}
