/**
 * sessionInsights — pure analysis layer for a completed SessionResult.
 * No I/O, no React, no side-effects. Deterministic.
 * Ticket 0264. Updated 0271 (trialFields), 0272 (flagCounts, responseClusters).
 */

import type { SessionResult, FlagKind } from "./types";
import {
  getResponseText,
  getResponseLen,
  getTimedOut,
  getBackspaces,
  getEdits,
  getCompositions,
  getFirstKeyMs,
} from "./trialFields";

// ── Types ─────────────────────────────────────────────────────────────

/** Drilldown-ready reference to a single scored trial. */
export interface TrialRef {
  sessionTrialIndex: number;
  orderIndex: number;
  position: number;
  word: string;
  reactionTimeMs: number;
  flags: FlagKind[];
  timedOut: boolean;
  response: string;
  responseLen: number;
  tFirstKeyMs: number | null;
  backspaces: number;
  edits: number;
  compositions: number;
}

/** One point in the RT timeline (x = position, y = reactionTimeMs). */
export interface TimelinePoint {
  sessionTrialIndex: number;
  x: number;
  y: number;
  timedOut: boolean;
  flags: FlagKind[];
}

/** Full insights summary for a session. */
export interface SessionInsights {
  // Quality
  trialCount: number;
  scoredCount: number;
  practiceCount: number;
  emptyResponseCount: number;
  timeoutCount: number;
  flaggedTrialCount: number;
  flaggedOtherCount: number;
  nonEmptyResponseRate: number;

  // Speed (scored & !timedOut RTs)
  meanRtMs: number;
  medianRtMs: number;
  p90RtMs: number;
  spikinessMs: number;
  minRtMs: number;
  maxRtMs: number;

  // Input (scored trials)
  totalBackspaces: number;
  totalEdits: number;
  totalCompositions: number;
  imeUsed: boolean;

  // Anomalies
  topSlowTrials: TrialRef[];
  topFastTrials: TrialRef[];

  // Charts
  timeline: TimelinePoint[];
  histogram: { binEdges: number[]; counts: number[] };

  // 0272: Aggregate patterns
  flagCounts: Partial<Record<FlagKind, number>>;
  responseClusters: Array<{
    response: string;
    count: number;
    words: string[];
    sessionTrialIndices: number[];
  }>;

  // Drilldown lookup
  trialRefs: TrialRef[];
  trialRefBySessionTrialIndex: Record<number, TrialRef>;
}

// ── Helpers ───────────────────────────────────────────────────────────

const TIMEOUT_FLAG_SPELLINGS: FlagKind[] = ["timeout"];

function isTimeoutFlag(f: FlagKind): boolean {
  return (TIMEOUT_FLAG_SPELLINGS as string[]).includes(f) || f === "timed_out" as string;
}

function isEmptyFlag(f: FlagKind): boolean {
  return f === "empty_response";
}

function sortedAsc(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function calcMedian(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calcP90(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const n = sorted.length;
  const idx = Math.max(0, Math.ceil(0.9 * n) - 1);
  return sorted[idx];
}

function buildHistogram(rts: number[]): { binEdges: number[]; counts: number[] } {
  if (rts.length === 0) return { binEdges: [], counts: [] };
  if (rts.length === 1) return { binEdges: [rts[0], rts[0] + 1], counts: [1] };
  const sorted = sortedAsc(rts);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bins = 10;
  const binWidth = max - min === 0 ? 1 : (max - min) / bins;
  const binEdges: number[] = Array.from({ length: bins + 1 }, (_, i) => min + i * binWidth);
  const counts: number[] = new Array(bins).fill(0);
  for (const rt of rts) {
    const idx = Math.min(Math.floor((rt - min) / binWidth), bins - 1);
    counts[idx]++;
  }
  return { binEdges, counts };
}

// ── buildSessionInsights ──────────────────────────────────────────────

/**
 * Deterministically summarise a SessionResult into SessionInsights.
 * Same input → same output.
 */
export function buildSessionInsights(session: SessionResult): SessionInsights {
  const { trials, scoring } = session;

  // 1. Build flagMap: sessionTrialIndex (in full trials[]) → FlagKind[]
  //    scoring.trialFlags[].trialIndex refers to index within scored subset.
  const scoredSubsetFlags = new Map<number, FlagKind[]>();
  for (const tf of scoring.trialFlags) {
    scoredSubsetFlags.set(tf.trialIndex, [...tf.flags] as FlagKind[]);
  }

  // 2. Separate scored (non-practice) trials preserving original indices
  const scoredPairs: Array<{ trialIndex: number; subsetIndex: number }> = [];
  let subIdx = 0;
  for (let i = 0; i < trials.length; i++) {
    if (!trials[i].isPractice) {
      scoredPairs.push({ trialIndex: i, subsetIndex: subIdx });
      subIdx++;
    }
  }

  // 3. Build TrialRefs + timeline + collect RTs
  const trialRefs: TrialRef[] = [];
  const trialRefBySessionTrialIndex: Record<number, TrialRef> = {};
  const timeline: TimelinePoint[] = [];
  const rtsNonTimeout: number[] = [];

  let emptyResponseCount = 0;
  let timeoutCount = 0;
  let flaggedTrialCount = 0;
  let flaggedOtherCount = 0;
  let totalBackspaces = 0;
  let totalEdits = 0;
  let totalCompositions = 0;

  // 0272: flag counts accumulator
  const flagCountsMap = new Map<FlagKind, number>();

  for (let pos = 0; pos < scoredPairs.length; pos++) {
    const { trialIndex, subsetIndex } = scoredPairs[pos];
    const trial = trials[trialIndex];
    const flags = (scoredSubsetFlags.get(subsetIndex) ?? []) as FlagKind[];

    // 0271: Use trialFields helpers — single source of truth
    const timedOut = getTimedOut(trial, flags);
    const response = getResponseText(trial);
    const responseLen = getResponseLen(trial);
    const isEmptyNonTimeout = !timedOut && responseLen === 0;

    const ref: TrialRef = {
      sessionTrialIndex: trialIndex,
      orderIndex: trial.stimulus.index,
      position: pos,
      word: trial.stimulus.word,
      reactionTimeMs: trial.association.reactionTimeMs,
      flags,
      timedOut,
      response,
      responseLen,
      tFirstKeyMs: getFirstKeyMs(trial),
      backspaces: getBackspaces(trial),
      edits: getEdits(trial),
      compositions: getCompositions(trial),
    };

    trialRefs.push(ref);
    trialRefBySessionTrialIndex[trialIndex] = ref;

    timeline.push({
      sessionTrialIndex: trialIndex,
      x: pos,
      y: trial.association.reactionTimeMs,
      timedOut,
      flags,
    });

    if (!timedOut) rtsNonTimeout.push(trial.association.reactionTimeMs);

    // Quality counters
    if (timedOut) timeoutCount++;
    else if (isEmptyNonTimeout) emptyResponseCount++;

    if (flags.length > 0) flaggedTrialCount++;
    if (flags.some((f) => !isTimeoutFlag(f) && !isEmptyFlag(f))) flaggedOtherCount++;

    // Input counters
    totalBackspaces += getBackspaces(trial);
    totalEdits += getEdits(trial);
    totalCompositions += getCompositions(trial);

    // 0272: accumulate flag counts
    for (const f of flags) {
      flagCountsMap.set(f, (flagCountsMap.get(f) ?? 0) + 1);
    }
  }

  const flagCounts = Object.fromEntries(flagCountsMap) as Partial<Record<FlagKind, number>>;

  // 4. Speed stats
  const sorted = sortedAsc(rtsNonTimeout);
  const meanRtMs = calcMean(rtsNonTimeout);
  const medianRtMs = calcMedian(sorted);
  const p90RtMs = calcP90(sorted);
  const minRtMs = sorted.length > 0 ? sorted[0] : 0;
  const maxRtMs = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
  const spikinessMs = maxRtMs - minRtMs;

  // 5. Histogram
  const histogram = buildHistogram(rtsNonTimeout);

  // 6. Anomalies (exclude timedOut + practice)
  const scoredNonTimeout = trialRefs.filter((r) => !r.timedOut);
  const topSlowTrials = [...scoredNonTimeout]
    .sort((a, b) => b.reactionTimeMs - a.reactionTimeMs)
    .slice(0, 5);
  const topFastTrials = [...scoredNonTimeout]
    .sort((a, b) => a.reactionTimeMs - b.reactionTimeMs)
    .slice(0, 5);

  const scoredCount = scoredPairs.length;
  const practiceCount = trials.length - scoredCount;
  const nonEmptyActive = trialRefs.filter((r) => !r.timedOut && r.responseLen > 0).length;
  const nonEmptyResponseRate = scoredCount === 0 ? 0 : nonEmptyActive / scoredCount;

  // 7. 0272: Response clusters (count >= 2), sorted by count desc
  const responseMap = new Map<string, { words: string[]; indices: number[] }>();
  for (const ref of trialRefs) {
    const key = ref.response;
    const entry = responseMap.get(key) ?? { words: [], indices: [] };
    entry.words.push(ref.word);
    entry.indices.push(ref.sessionTrialIndex);
    responseMap.set(key, entry);
  }
  const responseClusters = [...responseMap.entries()]
    .filter(([, v]) => v.words.length >= 2)
    .sort((a, b) => {
      const diff = b[1].words.length - a[1].words.length;
      return diff !== 0 ? diff : a[0].localeCompare(b[0]);
    })
    .map(([response, v]) => ({
      response,
      count: v.words.length,
      words: v.words,
      sessionTrialIndices: v.indices,
    }));

  return {
    trialCount: trials.length,
    scoredCount,
    practiceCount,
    emptyResponseCount,
    timeoutCount,
    flaggedTrialCount,
    flaggedOtherCount,
    nonEmptyResponseRate,
    meanRtMs,
    medianRtMs,
    p90RtMs,
    spikinessMs,
    minRtMs,
    maxRtMs,
    totalBackspaces,
    totalEdits,
    totalCompositions,
    imeUsed: totalCompositions > 0,
    topSlowTrials,
    topFastTrials,
    timeline,
    histogram,
    flagCounts,
    responseClusters,
    trialRefs,
    trialRefBySessionTrialIndex,
  };
}

// ── 0268: Quality index + micro-goal ─────────────────────────────────

export interface QualityIndex {
  score: number;
  penalties: Array<{ reason: string; points: number }>;
}

/** Compute a 0–100 quality index. Uses flaggedOtherCount to avoid double-penalties. */
export function computeQualityIndex(insights: SessionInsights): QualityIndex {
  const penalties: Array<{ reason: string; points: number }> = [];
  let deduction = 0;

  if (insights.emptyResponseCount > 0) {
    const pts = insights.emptyResponseCount * 5;
    penalties.push({ reason: "Empty responses", points: pts });
    deduction += pts;
  }
  if (insights.timeoutCount > 0) {
    const pts = insights.timeoutCount * 10;
    penalties.push({ reason: "Timeouts", points: pts });
    deduction += pts;
  }
  if (insights.flaggedOtherCount > 0) {
    const pts = insights.flaggedOtherCount * 2;
    penalties.push({ reason: "Flagged trials (other)", points: pts });
    deduction += pts;
  }

  const score = Math.max(0, Math.min(100, 100 - deduction));
  return { score, penalties };
}

/** Return a short actionable micro-goal for the next run. */
export function getMicroGoal(insights: SessionInsights): string {
  if (insights.emptyResponseCount > 2) return "Next run: aim for ≤ 2 empty responses";
  if (insights.timeoutCount > 0) return "Next run: avoid timeouts (consider breaks)";
  if (insights.spikinessMs > 400) return "Next run: try for steadier pace (lower spikes)";
  return "Next run: baseline repeat (stability check)";
}
