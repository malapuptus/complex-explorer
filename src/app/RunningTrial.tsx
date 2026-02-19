/**
 * RunningTrial — renders the active trial or break screen during a running session.
 * T0241: HomeBar added.
 */

import { useEffect, type MutableRefObject } from "react";
import type { StimulusWord } from "@/domain";
import { TrialView } from "./TrialView";
import { BreakScreen } from "./BreakScreen";
import { HomeBar } from "./HomeBar";
import type { TrialMetrics } from "./TrialView";

interface Props {
  currentWord: StimulusWord;
  currentIndex: number;
  words: StimulusWord[];
  practiceCount: number;
  breakEveryN: number;
  onBreak: boolean;
  setOnBreak: (v: boolean) => void;
  lastBreakAtRef: MutableRefObject<number>;
  seedUsed: number | null;
  trialTimeoutMs?: number;
  onSubmit: (response: string, metrics: TrialMetrics) => void;
  onTimeout: (metrics: TrialMetrics) => void;
}

export function RunningTrial({
  currentWord,
  currentIndex,
  words,
  practiceCount,
  breakEveryN,
  onBreak,
  setOnBreak,
  lastBreakAtRef,
  seedUsed,
  trialTimeoutMs,
  onSubmit,
  onTimeout,
}: Props) {
  const isPractice = currentIndex < practiceCount;
  const scoredCompleted = isPractice ? 0 : currentIndex - practiceCount;
  const totalScored = words.length - practiceCount;

  // Trigger break via effect (not during render).
  // Guards: !onBreak prevents re-fire while showing break screen;
  // lastBreakAtRef prevents duplicate triggers for the same threshold
  // (including React Strict Mode double-invocation).
  useEffect(() => {
    if (
      breakEveryN > 0 &&
      !isPractice &&
      scoredCompleted > 0 &&
      scoredCompleted % breakEveryN === 0 &&
      !onBreak &&
      scoredCompleted !== lastBreakAtRef.current
    ) {
      lastBreakAtRef.current = scoredCompleted;
      setOnBreak(true);
    }
  }, [scoredCompleted, breakEveryN, isPractice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show break screen (onBreak is the single source of truth)
  if (onBreak) {
    return (
      <BreakScreen
        completedScored={scoredCompleted}
        totalScored={totalScored}
        onContinue={() => {
          setOnBreak(false);
        }}
      />
    );
  }

  const showSeedBanner = seedUsed !== null && scoredCompleted === 0 && !isPractice;

  return (
    <>
      <HomeBar confirmLeave />
      <div className="flex flex-col items-center pt-10">
        {showSeedBanner && (
          <p className="mb-2 text-xs text-muted-foreground">Seed: {seedUsed}</p>
        )}
        <TrialView
          word={currentWord.word}
          index={currentIndex}
          total={words.length}
          isPractice={isPractice}
          practiceCount={practiceCount}
          trialTimeoutMs={trialTimeoutMs}
          onSubmit={onSubmit}
          onTimeout={onTimeout}
        />
      </div>
    </>
  );
}
