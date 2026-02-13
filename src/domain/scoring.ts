/**
 * Pure scoring logic for a completed set of trials.
 * No I/O, no side-effects.
 */

import type {
  Trial,
  SessionScoring,
  TrialFlag,
  FlagKind,
  SessionSummary,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────────

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const sumSq = values.reduce((s, v) => s + (v - avg) ** 2, 0);
  return Math.sqrt(sumSq / values.length);
}

// ── Scoring ──────────────────────────────────────────────────────────

/** Threshold: responses faster than this (ms) are flagged. */
const FAST_THRESHOLD_MS = 200;

/**
 * Score a completed set of trials.
 *
 * Timing outlier detection uses ±2 standard deviations from the mean
 * reaction time (only among non-empty responses).
 *
 * @returns Deterministic scoring output — same input always same output.
 */
export function scoreSession(trials: Trial[]): SessionScoring {
  // Exclude practice trials from scoring
  const scoredTrials = trials.filter((t) => !t.isPractice);

  if (scoredTrials.length === 0) {
    return {
      trialFlags: [],
      summary: emptySummary(),
    };
  }

  // Collect reaction times for non-empty responses
  const validTimes = scoredTrials
    .filter((t) => t.association.response.trim() !== "")
    .map((t) => t.association.reactionTimeMs);

  const avgTime = mean(validTimes);
  const sd = stdDev(validTimes, avgTime);
  const slowThreshold = avgTime + 2 * sd;

  // Track repeated responses (only among scored trials)
  const seenResponses = new Map<string, number>();

  const trialFlags: TrialFlag[] = [];

  for (let i = 0; i < scoredTrials.length; i++) {
    const trial = scoredTrials[i];
    const flags: FlagKind[] = [];
    const resp = trial.association.response.trim().toLowerCase();
    const rt = trial.association.reactionTimeMs;

    // Empty response
    if (resp === "") {
      flags.push("empty_response");
    } else {
      // Repeated response
      const prev = seenResponses.get(resp);
      if (prev !== undefined) {
        flags.push("repeated_response");
      }
      seenResponses.set(resp, i);

      // Timing outliers (only for non-empty responses with enough data)
      if (validTimes.length >= 3) {
        if (rt > slowThreshold) {
          flags.push("timing_outlier_slow");
        }
        if (rt < FAST_THRESHOLD_MS) {
          flags.push("timing_outlier_fast");
        }
      }
    }

    trialFlags.push({ trialIndex: i, flags });
  }

  const allTimes = scoredTrials.map((t) => t.association.reactionTimeMs);
  const sortedTimes = [...allTimes].sort((a, b) => a - b);

  const summary: SessionSummary = {
    totalTrials: scoredTrials.length,
    meanReactionTimeMs: round2(mean(allTimes)),
    medianReactionTimeMs: round2(median(sortedTimes)),
    stdDevReactionTimeMs: round2(stdDev(allTimes, mean(allTimes))),
    emptyResponseCount: trialFlags.filter((f) =>
      f.flags.includes("empty_response"),
    ).length,
    repeatedResponseCount: trialFlags.filter((f) =>
      f.flags.includes("repeated_response"),
    ).length,
    timingOutlierCount: trialFlags.filter(
      (f) =>
        f.flags.includes("timing_outlier_slow") ||
        f.flags.includes("timing_outlier_fast"),
    ).length,
  };

  return { trialFlags, summary };
}

function emptySummary(): SessionSummary {
  return {
    totalTrials: 0,
    meanReactionTimeMs: 0,
    medianReactionTimeMs: 0,
    stdDevReactionTimeMs: 0,
    emptyResponseCount: 0,
    repeatedResponseCount: 0,
    timingOutlierCount: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
