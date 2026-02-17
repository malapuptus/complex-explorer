/**
 * useSession — manages the state machine for a word-association session.
 * Pure React state; no persistence, no network.
 */

import { useState, useCallback, useRef, useMemo } from "react";
import type { Trial, StimulusWord, SessionScoring, OrderPolicy } from "@/domain";
import { scoreSession, seededShuffle, randomSeed } from "@/domain";

export type SessionPhase = "idle" | "running" | "done";

export interface UseSessionOptions {
  /** Words used for practice (warm-up), excluded from scoring. */
  practiceWords?: string[];
  /** Order policy: "fixed" keeps original order, "seeded" shuffles. */
  orderPolicy?: OrderPolicy;
  /** Explicit seed for "seeded" policy (auto-generated if omitted). */
  seed?: number;
  /** Per-trial timeout in ms. Undefined = no timeout. */
  trialTimeoutMs?: number;
}

export interface SessionState {
  phase: SessionPhase;
  words: StimulusWord[];
  currentIndex: number;
  trials: Trial[];
  scoring: SessionScoring | null;
  practiceCount: number;
  seedUsed: number | null;
  stimulusOrder: string[];
  trialTimeoutMs?: number;
}

/** Snapshot for restoring a session from a draft. */
export interface SessionSnapshot {
  words: StimulusWord[];
  currentIndex: number;
  trials: Trial[];
  practiceCount: number;
  seedUsed: number | null;
  stimulusOrder: string[];
  trialTimeoutMs?: number;
}

/** Overrides passed at start time (from protocol screen). */
export interface StartOverrides {
  orderPolicy?: OrderPolicy;
  seed?: number | null;
  trialTimeoutMs?: number;
}

export function useSession(words: string[], options?: UseSessionOptions) {
  const practiceWords = options?.practiceWords ?? [];
  const defaultOrderPolicy = options?.orderPolicy ?? "fixed";
  const practiceCount = practiceWords.length;
  const defaultTimeoutMs = options?.trialTimeoutMs;

  const baseWords = useMemo(() => [...words], [words]);

  const buildState = useCallback(
    (phase: SessionPhase, overrides?: StartOverrides): SessionState => {
      const orderPolicy = overrides?.orderPolicy ?? defaultOrderPolicy;
      const timeoutMs = overrides?.trialTimeoutMs ?? defaultTimeoutMs;
      let scoredWords: string[];
      let seedUsed: number | null = null;

      if (orderPolicy === "seeded") {
        seedUsed = overrides?.seed != null ? overrides.seed : (options?.seed ?? randomSeed());
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
        trialTimeoutMs: timeoutMs,
      };
    },
    [baseWords, practiceWords, practiceCount, defaultOrderPolicy, options?.seed, defaultTimeoutMs],
  );

  const [state, setState] = useState<SessionState>(() => buildState("idle"));

  const trialStartRef = useRef<number>(0);

  const start = useCallback(
    (overrides?: StartOverrides) => {
      trialStartRef.current = performance.now();
      setState(buildState("running", overrides));
    },
    [buildState],
  );

  /** Restore a running session from a draft snapshot. */
  const restore = useCallback((snapshot: SessionSnapshot) => {
    trialStartRef.current = performance.now();
    setState({
      phase: "running",
      words: snapshot.words,
      currentIndex: snapshot.currentIndex,
      trials: [...snapshot.trials],
      scoring: null,
      practiceCount: snapshot.practiceCount,
      seedUsed: snapshot.seedUsed,
      stimulusOrder: [...snapshot.stimulusOrder],
      trialTimeoutMs: snapshot.trialTimeoutMs,
    });
  }, []);

  const advanceTrial = useCallback(
    (
      response: string,
      metrics: {
        tFirstKeyMs: number | null;
        backspaceCount: number;
        editCount: number;
        compositionCount?: number;
      },
      timedOut: boolean,
    ) => {
      const now = performance.now();
      const reactionTimeMs = timedOut
        ? (state.trialTimeoutMs ?? now - trialStartRef.current)
        : now - trialStartRef.current;

      setState((prev) => {
        if (prev.phase !== "running") return prev;

        const isPractice = prev.currentIndex < prev.practiceCount;
        const trial: Trial = {
          stimulus: prev.words[prev.currentIndex],
          association: {
            response: response.trim(),
            reactionTimeMs: Math.round(reactionTimeMs),
            tFirstKeyMs: metrics.tFirstKeyMs !== null ? Math.round(metrics.tFirstKeyMs) : null,
            backspaceCount: metrics.backspaceCount,
            editCount: metrics.editCount,
            compositionCount: metrics.compositionCount ?? 0,
          },
          isPractice,
          timedOut: timedOut || undefined,
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

        trialStartRef.current = performance.now();

        return {
          ...prev,
          trials: newTrials,
          currentIndex: nextIndex,
        };
      });
    },
    [state.trialTimeoutMs],
  );

  const submitResponse = useCallback(
    (
      response: string,
      metrics: {
        tFirstKeyMs: number | null;
        backspaceCount: number;
        editCount: number;
        compositionCount?: number;
      },
    ) => {
      advanceTrial(response, metrics, false);
    },
    [advanceTrial],
  );

  const handleTimeout = useCallback(
    (metrics: {
      tFirstKeyMs: number | null;
      backspaceCount: number;
      editCount: number;
      compositionCount?: number;
    }) => {
      advanceTrial("", metrics, true);
    },
    [advanceTrial],
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
    restore,
    submitResponse,
    handleTimeout,
    reset,
  };
}
