/**
 * DemoSession — runs a 10-word demo and shows raw results.
 * Saves completed sessions via SessionStore adapter.
 */

import { getStimulusList } from "@/domain";
import type { SessionResult } from "@/domain";
import { localStorageSessionStore } from "@/infra";
import { useSession } from "./useSession";
import { TrialView } from "./TrialView";
import { ResultsView } from "./ResultsView";
import { useEffect, useRef } from "react";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function DemoSession() {
  const list = getStimulusList("demo-10", "1.0.0")!;
  const session = useSession(list.words as string[]);
  const savedRef = useRef(false);

  useEffect(() => {
    if (session.phase === "done" && session.scoring && !savedRef.current) {
      savedRef.current = true;
      const result: SessionResult = {
        id: generateId(),
        config: {
          stimulusListId: list.id,
          stimulusListVersion: list.version,
          maxResponseTimeMs: 0,
        },
        trials: session.trials,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        scoring: session.scoring,
      };
      localStorageSessionStore.save(result);
    }
  }, [session.phase, session.scoring, session.trials, list]);

  const handleReset = () => {
    savedRef.current = false;
    session.reset();
  };

  if (session.phase === "idle") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold text-foreground">
          Word Association Demo
        </h1>
        <p className="max-w-md text-center text-muted-foreground">
          You'll see {list.words.length} words, one at a time. Type the first
          word that comes to mind and press Enter or click Next.
        </p>
        <p className="text-xs text-muted-foreground">
          Source: {list.source}
        </p>
        <button
          onClick={session.start}
          className="rounded-md bg-primary px-8 py-3 text-lg text-primary-foreground hover:opacity-90"
        >
          Start
        </button>
      </div>
    );
  }

  if (session.phase === "running" && session.currentWord) {
    return (
      <TrialView
        word={session.currentWord.word}
        index={session.currentIndex}
        total={session.words.length}
        onSubmit={session.submitResponse}
      />
    );
  }

  if (session.phase === "done" && session.scoring) {
    return (
      <ResultsView
        trials={session.trials}
        trialFlags={session.scoring.trialFlags}
        meanReactionTimeMs={session.scoring.summary.meanReactionTimeMs}
        medianReactionTimeMs={session.scoring.summary.medianReactionTimeMs}
        onReset={handleReset}
      />
    );
  }

  return null;
}
