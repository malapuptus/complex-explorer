/**
 * useSession — manages the state machine for a word-association session.
 * Pure React state; no persistence, no network.
 */

import { useState, useCallback, useRef, useMemo } from "react";
import type {
  Trial,
  StimulusWord,
  SessionScoring,
  OrderPolicy,
} from "@/domain";
import { scoreSession, seededShuffle, randomSeed } from "@/domain";

export type SessionPhase = "idle" | "running" | "done";

export interface UseSessionOptions {
  /** Words used for practice (warm-up), excluded from scoring. */
  practiceWords?: string[];
  /** Order policy: "fixed" keeps original order, "seeded" shuffles. */
  orderPolicy?: OrderPolicy;
  /** Explicit seed for "seeded" policy (auto-generated if omitted). */
  seed?: number;
}

export interface SessionState {
  phase: SessionPhase;
  words: StimulusWord[];
  currentIndex: number;
  trials: Trial[];
  scoring: SessionScoring | null;
  /** Number of practice words at the start. */
  practiceCount: number;
  /** The seed used for this session (null if fixed). */
  seedUsed: number | null;
  /** The realized scored word order (excluding practice). */
  stimulusOrder: string[];
}

export function useSession(words: string[], options?: UseSessionOptions) {
  const practiceWords = options?.practiceWords ?? [];
  const orderPolicy = options?.orderPolicy ?? "fixed";
  const practiceCount = practiceWords.length;

  // Memoize the base stimuli list (before any shuffle)
  const baseWords = useMemo(() => [...words], [words]);

  const buildState = useCallback(
    (phase: SessionPhase): SessionState => {
      let scoredWords: string[];
      let seedUsed: number | null = null;

      if (orderPolicy === "seeded") {
        seedUsed = options?.seed ?? randomSeed();
        scoredWords = seededShuffle(baseWords, seedUsed);
      } else {
        scoredWords = [...baseWords];
      }

      const allWords = [...practiceWords, ...scoredWords];
      const stimuli: StimulusWord[] = allWords.map((word, index) => ({
        word,
        index,
      }));

      return {
        phase,
        words: stimuli,
        currentIndex: 0,
        trials: [],
        scoring: null,
        practiceCount,
        seedUsed,
        stimulusOrder: scoredWords,
      };
    },
    [baseWords, practiceWords, practiceCount, orderPolicy, options?.seed],
  );

  const [state, setState] = useState<SessionState>(() => buildState("idle"));

  const trialStartRef = useRef<number>(0);

  const start = useCallback(() => {
    trialStartRef.current = performance.now();
    setState(buildState("running"));
  }, [buildState]);

  const submitResponse = useCallback(
    (
      response: string,
      metrics: {
        tFirstKeyMs: number | null;
        backspaceCount: number;
        editCount: number;
      },
    ) => {
      const now = performance.now();
      const reactionTimeMs = now - trialStartRef.current;

      setState((prev) => {
        if (prev.phase !== "running") return prev;

        const isPractice = prev.currentIndex < prev.practiceCount;
        const trial: Trial = {
          stimulus: prev.words[prev.currentIndex],
          association: {
            response: response.trim(),
            reactionTimeMs: Math.round(reactionTimeMs),
            tFirstKeyMs:
              metrics.tFirstKeyMs !== null
                ? Math.round(metrics.tFirstKeyMs)
                : null,
            backspaceCount: metrics.backspaceCount,
            editCount: metrics.editCount,
          },
          isPractice,
        };

        const newTrials = [...prev.trials, trial];
        const nextIndex = prev.currentIndex + 1;
        const isDone = nextIndex >= prev.words.length;

        if (isDone) {
          return {
            ...prev,
            trials: newTrials,
            currentIndex: nextIndex,
            phase: "done" as SessionPhase,
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
    setState(buildState("idle"));
  }, [buildState]);

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
