/**
 * RunningTrial — renders the active trial or break screen during a running session.
 * T0241: HomeBar added.
 * T0248: Stop & Ground dialog.
 */

import { useEffect, useState, type MutableRefObject } from "react";
import type { StimulusWord } from "@/domain";
import { TrialView } from "./TrialView";
import { BreakScreen } from "./BreakScreen";
import { HomeBar } from "./HomeBar";
import { StopGroundDialog } from "./StopGroundDialog";
import type { TrialMetrics } from "./TrialView";
import type { SessionMode } from "./ProtocolScreen";

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
  sessionMode?: SessionMode;
  onEndSession?: () => void;
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
  sessionMode,
  onEndSession,
}: Props) {
  const isPractice = currentIndex < practiceCount;
  const scoredCompleted = isPractice ? 0 : currentIndex - practiceCount;
  const totalScored = words.length - practiceCount;

  const [stopDialogOpen, setStopDialogOpen] = useState(false);

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

  if (onBreak) {
    return (
      <BreakScreen
        completedScored={scoredCompleted}
        totalScored={totalScored}
        onContinue={() => setOnBreak(false)}
        sessionMode={sessionMode}
        onEndSession={onEndSession}
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

        {/* T0248: Stop & Ground button */}
        <button
          type="button"
          onClick={() => setStopDialogOpen(true)}
          className="mb-4 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          Stop &amp; Ground
        </button>

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

      <StopGroundDialog
        open={stopDialogOpen}
        onOpenChange={setStopDialogOpen}
        onResume={() => {}}
        onEnd={() => { onEndSession?.(); window.location.href = "/"; }}
        showTimingWarning={sessionMode === "research"}
      />
    </>
  );
}
