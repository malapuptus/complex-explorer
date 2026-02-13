/**
 * DemoSession — runs a 10-word demo and shows raw results.
 * Saves completed sessions via SessionStore adapter.
 */

import { getStimulusList } from "@/domain";
import type { SessionResult, OrderPolicy } from "@/domain";
import { localStorageSessionStore } from "@/infra";
import { useSession } from "./useSession";
import { TrialView } from "./TrialView";
import { ResultsView } from "./ResultsView";
import { ProtocolScreen } from "./ProtocolScreen";
import { useEffect, useRef, useState } from "react";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const PRACTICE_WORDS = ["sun", "table", "road"];

export function DemoSession() {
  const list = getStimulusList("demo-10", "1.0.0")!;
  const [orderPolicy, setOrderPolicy] = useState<OrderPolicy>("fixed");

  const session = useSession(list.words as string[], {
    practiceWords: PRACTICE_WORDS,
    orderPolicy,
  });
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
          orderPolicy,
          seed: session.seedUsed,
        },
        trials: session.trials,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        scoring: session.scoring,
        seedUsed: session.seedUsed,
        stimulusOrder: session.stimulusOrder,
      };
      localStorageSessionStore.save(result);
    }
  }, [session.phase, session.scoring, session.trials, list, orderPolicy, session.seedUsed, session.stimulusOrder]);

  const handleReset = () => {
    savedRef.current = false;
    session.reset();
  };

  if (session.phase === "idle") {
    return (
      <ProtocolScreen
        wordCount={list.words.length}
        practiceCount={PRACTICE_WORDS.length}
        source={list.source}
        onReady={session.start}
      >
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Word order:</label>
          <select
            value={orderPolicy}
            onChange={(e) => setOrderPolicy(e.target.value as OrderPolicy)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <option value="fixed">Fixed</option>
            <option value="seeded">Randomized</option>
          </select>
        </div>
      </ProtocolScreen>
    );
  }

  if (session.phase === "running" && session.currentWord) {
    const isPractice = session.currentIndex < session.practiceCount;
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
