/**
 * Pure scoring logic for a completed set of trials.
 * No I/O, no side-effects.
 */

import type { Trial, SessionScoring, TrialFlag, FlagKind, SessionSummary } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────

function sortedCopy(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
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

/**
 * Median Absolute Deviation (MAD).
 * A robust measure of spread that is resistant to outliers.
 * For normally distributed data, MAD ≈ 0.6745 × σ.
 */
function mad(values: number[], med: number): number {
  if (values.length < 2) return 0;
  const deviations = sortedCopy(values.map((v) => Math.abs(v - med)));
  return median(deviations);
}

// ── Scoring ──────────────────────────────────────────────────────────

/** Threshold: responses faster than this (ms) are flagged. */
const FAST_THRESHOLD_MS = 200;

/** Threshold: backspaceCount above this flags "high_editing". */
const HIGH_EDITING_THRESHOLD = 3;

/**
 * Modified Z-score multiplier for MAD-based outlier detection.
 * A value beyond ±3.5 modified Z-scores is considered an outlier.
 * This is the Iglewicz & Hoaglin (1993) recommendation.
 *
 * Modified Z = 0.6745 × (x - median) / MAD
 * Outlier if |Modified Z| > 3.5
 *
 * For small samples (n < 5), we skip outlier detection entirely
 * since robust statistics need a minimum sample size.
 */
const MODIFIED_Z_THRESHOLD = 3.5;
const MAD_TO_Z_FACTOR = 0.6745;
const MIN_SAMPLE_FOR_OUTLIERS = 5;

/**
 * Score a completed set of trials.
 *
 * Timing outlier detection uses MAD (Median Absolute Deviation) based
 * modified Z-scores, which are robust to small sample sizes and resistant
 * to the influence of outliers themselves (unlike mean ± 2σ).
 *
 * Reference: Iglewicz & Hoaglin, "Volume 16: How to Detect and Handle
 * Outliers" (1993).
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

  // Collect reaction times for non-empty, non-timeout responses
  const validTimes = scoredTrials
    .filter((t) => t.association.response.trim() !== "" && !t.timedOut)
    .map((t) => t.association.reactionTimeMs);

  const sortedValid = sortedCopy(validTimes);
  const med = median(sortedValid);
  const madValue = mad(validTimes, med);

  // Track repeated responses (only among scored trials)
  const seenResponses = new Map<string, number>();

  const trialFlags: TrialFlag[] = [];

  for (let i = 0; i < scoredTrials.length; i++) {
    const trial = scoredTrials[i];
    const flags: FlagKind[] = [];
    const resp = trial.association.response.trim().toLowerCase();
    const rt = trial.association.reactionTimeMs;

    // Timeout flag — distinct from empty_response
    if (trial.timedOut) {
      flags.push("timeout");
    } else if (resp === "") {
      // Empty response (user hit submit with nothing)
      flags.push("empty_response");
    } else {
      // Repeated response
      const prev = seenResponses.get(resp);
      if (prev !== undefined) {
        flags.push("repeated_response");
      }
      seenResponses.set(resp, i);

      // Timing outliers using MAD-based modified Z-scores.
      // Only flag when we have enough data and MAD > 0 (non-degenerate).
      if (validTimes.length >= MIN_SAMPLE_FOR_OUTLIERS && madValue > 0) {
        const modifiedZ = (MAD_TO_Z_FACTOR * (rt - med)) / madValue;
        if (modifiedZ > MODIFIED_Z_THRESHOLD) {
          flags.push("timing_outlier_slow");
        }
      }
      // Absolute fast threshold — always applied regardless of sample size
      if (rt < FAST_THRESHOLD_MS) {
        flags.push("timing_outlier_fast");
      }
    }

    // High editing flag
    if (trial.association.backspaceCount > HIGH_EDITING_THRESHOLD) {
      flags.push("high_editing");
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
    emptyResponseCount: trialFlags.filter((f) => f.flags.includes("empty_response")).length,
    repeatedResponseCount: trialFlags.filter((f) => f.flags.includes("repeated_response")).length,
    timingOutlierCount: trialFlags.filter(
      (f) => f.flags.includes("timing_outlier_slow") || f.flags.includes("timing_outlier_fast"),
    ).length,
    highEditingCount: trialFlags.filter((f) => f.flags.includes("high_editing")).length,
    timeoutCount: trialFlags.filter((f) => f.flags.includes("timeout")).length,
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
    highEditingCount: 0,
    timeoutCount: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
