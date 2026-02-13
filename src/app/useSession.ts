/**
 * useSession — manages the state machine for a word-association session.
 * Pure React state; no persistence, no network.
 */

import { useState, useCallback, useRef } from "react";
import type { Trial, StimulusWord, SessionScoring } from "@/domain";
import { scoreSession } from "@/domain";

export type SessionPhase = "idle" | "running" | "done";

export interface SessionState {
  phase: SessionPhase;
  words: StimulusWord[];
  currentIndex: number;
  trials: Trial[];
  scoring: SessionScoring | null;
}

export function useSession(words: string[]) {
  const stimuli: StimulusWord[] = words.map((word, index) => ({ word, index }));

  const [state, setState] = useState<SessionState>({
    phase: "idle",
    words: stimuli,
    currentIndex: 0,
    trials: [],
    scoring: null,
  });

  const trialStartRef = useRef<number>(0);

  const start = useCallback(() => {
    trialStartRef.current = performance.now();
    setState({
      phase: "running",
      words: stimuli,
      currentIndex: 0,
      trials: [],
      scoring: null,
    });
  }, [stimuli]);

  const submitResponse = useCallback(
    (response: string) => {
      const now = performance.now();
      const reactionTimeMs = now - trialStartRef.current;

      setState((prev) => {
        if (prev.phase !== "running") return prev;

        const trial: Trial = {
          stimulus: prev.words[prev.currentIndex],
          association: {
            response: response.trim(),
            reactionTimeMs: Math.round(reactionTimeMs),
          },
        };

        const newTrials = [...prev.trials, trial];
        const nextIndex = prev.currentIndex + 1;
        const isDone = nextIndex >= prev.words.length;

        if (isDone) {
          return {
            ...prev,
            trials: newTrials,
            currentIndex: nextIndex,
            phase: "done",
            scoring: scoreSession(newTrials),
          };
        }

        // Reset timer for next trial
        trialStartRef.current = performance.now();

        return {
          ...prev,
          trials: newTrials,
          currentIndex: nextIndex,
        };
      });
    },
    [],
  );

  const reset = useCallback(() => {
    setState({
      phase: "idle",
      words: stimuli,
      currentIndex: 0,
      trials: [],
      scoring: null,
    });
  }, [stimuli]);

  return {
    ...state,
    currentWord:
      state.phase === "running" && state.currentIndex < state.words.length
        ? state.words[state.currentIndex]
        : null,
    start,
    submitResponse,
    reset,
  };
}
