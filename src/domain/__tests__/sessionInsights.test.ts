/**
 * Tests for sessionInsights.ts — Tickets 0264 + 0268.
 */

import { describe, it, expect } from "vitest";
import {
  buildSessionInsights,
  computeQualityIndex,
  getMicroGoal,
} from "../sessionInsights";
import type { SessionResult, Trial, FlagKind } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────

function makeTrial(
  word: string,
  index: number,
  rt: number,
  opts: {
    isPractice?: boolean;
    timedOut?: boolean;
    response?: string;
    backspaces?: number;
    edits?: number;
    compositions?: number;
    tFirstKeyMs?: number | null;
  } = {},
): Trial {
  return {
    stimulus: { word, index },
    association: {
      response: opts.response ?? word,
      reactionTimeMs: rt,
      tFirstKeyMs: opts.tFirstKeyMs ?? null,
      backspaceCount: opts.backspaces ?? 0,
      editCount: opts.edits ?? 1,
      compositionCount: opts.compositions ?? 0,
    },
    isPractice: opts.isPractice ?? false,
    timedOut: opts.timedOut,
  };
}

function makeSession(
  trials: Trial[],
  flagOverrides?: Array<{ trialIndex: number; flags: FlagKind[] }>,
): SessionResult {
  // Build scoring from trials (simple — just use the actual scoreSession output shape)
  const scored = trials.filter((t) => !t.isPractice);
  const trialFlags =
    flagOverrides ??
    scored.map((_, i) => ({ trialIndex: i, flags: [] as FlagKind[] }));

  const rts = scored.filter((t) => !t.timedOut).map((t) => t.association.reactionTimeMs);
  const sortedRts = [...rts].sort((a, b) => a - b);
  const mean = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;
  const mid = Math.floor(sortedRts.length / 2);
  const med =
    sortedRts.length === 0
      ? 0
      : sortedRts.length % 2 === 0
      ? (sortedRts[mid - 1] + sortedRts[mid]) / 2
      : sortedRts[mid];

  return {
    id: "test-session",
    config: {
      stimulusListId: "test",
      stimulusListVersion: "1.0.0",
      maxResponseTimeMs: 0,
      orderPolicy: "fixed",
      seed: null,
    },
    trials,
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-01T00:10:00Z",
    seedUsed: null,
    stimulusOrder: scored.map((t) => t.stimulus.word),
    provenanceSnapshot: null,
    sessionFingerprint: null,
    scoringVersion: null,
    appVersion: null,
    stimulusPackSnapshot: null,
    importedFrom: null,
    sessionContext: null,
    scoring: {
      trialFlags,
      summary: {
        totalTrials: scored.length,
        meanReactionTimeMs: Math.round(mean),
        medianReactionTimeMs: Math.round(med),
        stdDevReactionTimeMs: 0,
        emptyResponseCount: scored.filter((t) => t.association.response === "").length,
        repeatedResponseCount: 0,
        timingOutlierCount: 0,
        highEditingCount: 0,
        timeoutCount: scored.filter((t) => t.timedOut).length,
      },
    },
  };
}

// ── 0264 Tests ────────────────────────────────────────────────────────

describe("buildSessionInsights", () => {
  describe("flag map correctness", () => {
    it("maps scoring.trialFlags by subset index to the correct TrialRef", () => {
      const trials = [
        makeTrial("tree", 0, 420),
        makeTrial("house", 1, 380),
      ];
      const session = makeSession(trials, [
        { trialIndex: 0, flags: ["timing_outlier_slow"] },
        { trialIndex: 1, flags: [] },
      ]);
      const ins = buildSessionInsights(session);
      expect(ins.trialRefs[0].flags).toEqual(["timing_outlier_slow"]);
      expect(ins.trialRefs[1].flags).toEqual([]);
    });

    it("trialRefBySessionTrialIndex contains correct TrialRef including response", () => {
      const trials = [makeTrial("apple", 0, 300, { response: "fruit" })];
      const session = makeSession(trials);
      const ins = buildSessionInsights(session);
      const ref = ins.trialRefBySessionTrialIndex[0];
      expect(ref).toBeDefined();
      expect(ref.word).toBe("apple");
      expect(ref.response).toBe("fruit");
      expect(ref.sessionTrialIndex).toBe(0);
      expect(ref.orderIndex).toBe(0);
      expect(ref.position).toBe(0);
    });

    it("sessionTrialIndex points to original array index (not subset)", () => {
      const trials = [
        makeTrial("practice", 0, 300, { isPractice: true }),
        makeTrial("real", 1, 500),
      ];
      const session = makeSession(trials);
      const ins = buildSessionInsights(session);
      // The scored trial is at index 1 in trials[]
      expect(ins.trialRefs[0].sessionTrialIndex).toBe(1);
      expect(ins.trialRefBySessionTrialIndex[1]).toBeDefined();
      expect(ins.trialRefBySessionTrialIndex[0]).toBeUndefined();
    });
  });

  describe("median", () => {
    it("uses average of two middle values for even n", () => {
      const trials = [
        makeTrial("a", 0, 100),
        makeTrial("b", 1, 200),
        makeTrial("c", 2, 300),
        makeTrial("d", 3, 400),
      ];
      const session = makeSession(trials);
      const ins = buildSessionInsights(session);
      expect(ins.medianRtMs).toBe(250); // (200+300)/2
    });

    it("returns single value for odd n", () => {
      const trials = [makeTrial("a", 0, 100), makeTrial("b", 1, 300), makeTrial("c", 2, 500)];
      const session = makeSession(trials);
      const ins = buildSessionInsights(session);
      expect(ins.medianRtMs).toBe(300);
    });
  });

  describe("p90 nearest-rank", () => {
    it("for n=10 [100..1000] p90 = 900", () => {
      const trials = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((rt, i) =>
        makeTrial(`w${i}`, i, rt),
      );
      const session = makeSession(trials);
      const ins = buildSessionInsights(session);
      expect(ins.p90RtMs).toBe(900);
    });

    it("for n=3 (fixture canary: tree/420, house/380, water/510) p90 = 510", () => {
      const trials = [makeTrial("tree", 0, 420), makeTrial("house", 1, 380), makeTrial("water", 2, 510)];
      const session = makeSession(trials);
      const ins = buildSessionInsights(session);
      expect(ins.scoredCount).toBe(3);
      expect(ins.medianRtMs).toBe(420);
      expect(ins.p90RtMs).toBe(510);
      expect(ins.meanRtMs).toBeCloseTo(436.67, 1);
      expect(ins.spikinessMs).toBe(130); // 510-380
      expect(ins.emptyResponseCount).toBe(0);
      expect(ins.timeoutCount).toBe(0);
      expect(ins.flaggedOtherCount).toBe(0);
    });
  });

  describe("nonEmptyResponseRate", () => {
    it("excludes timedOut from non-empty numerator", () => {
      const trials = [
        makeTrial("a", 0, 100, { response: "x" }),
        makeTrial("b", 1, 200, { timedOut: true, response: "" }),
        makeTrial("c", 2, 300, { response: "y" }),
      ];
      const session = makeSession(trials, [
        { trialIndex: 0, flags: [] },
        { trialIndex: 1, flags: ["timeout"] },
        { trialIndex: 2, flags: [] },
      ]);
      const ins = buildSessionInsights(session);
      // scoredCount=3, non-empty & !timedOut = 2 → rate = 2/3
      expect(ins.nonEmptyResponseRate).toBeCloseTo(2 / 3);
    });

    it("returns 0 when scoredCount is 0", () => {
      const session = makeSession([makeTrial("p", 0, 100, { isPractice: true })]);
      const ins = buildSessionInsights(session);
      expect(ins.nonEmptyResponseRate).toBe(0);
      expect(ins.scoredCount).toBe(0);
    });

    it("respects empty response (non-timeout)", () => {
      const trials = [
        makeTrial("a", 0, 100, { response: "" }),
        makeTrial("b", 1, 200, { response: "ok" }),
      ];
      const session = makeSession(trials, [
        { trialIndex: 0, flags: ["empty_response"] },
        { trialIndex: 1, flags: [] },
      ]);
      const ins = buildSessionInsights(session);
      expect(ins.emptyResponseCount).toBe(1);
      expect(ins.nonEmptyResponseRate).toBeCloseTo(1 / 2);
    });
  });

  describe("IME detection", () => {
    it("imeUsed = true when any compositionCount > 0", () => {
      const trials = [makeTrial("a", 0, 200, { compositions: 1 })];
      const ins = buildSessionInsights(makeSession(trials));
      expect(ins.imeUsed).toBe(true);
      expect(ins.totalCompositions).toBe(1);
    });

    it("imeUsed = false when all compositions = 0", () => {
      const trials = [makeTrial("a", 0, 200, { compositions: 0 })];
      const ins = buildSessionInsights(makeSession(trials));
      expect(ins.imeUsed).toBe(false);
    });
  });

  describe("histogram", () => {
    it("n=0 → empty edges and counts", () => {
      // All timedOut — so no non-timeout RTs
      const trials = [makeTrial("a", 0, 3000, { timedOut: true })];
      const session = makeSession(trials, [{ trialIndex: 0, flags: ["timeout"] }]);
      const ins = buildSessionInsights(session);
      expect(ins.histogram.binEdges).toEqual([]);
      expect(ins.histogram.counts).toEqual([]);
    });

    it("n=1 → binEdges [rt, rt+1], counts [1]", () => {
      const trials = [makeTrial("a", 0, 500)];
      const ins = buildSessionInsights(makeSession(trials));
      expect(ins.histogram.binEdges).toEqual([500, 501]);
      expect(ins.histogram.counts).toEqual([1]);
    });

    it("deterministic — same input same edges and counts", () => {
      const trials = [100, 200, 300, 400, 500].map((rt, i) => makeTrial(`w${i}`, i, rt));
      const session = makeSession(trials);
      const a = buildSessionInsights(session);
      const b = buildSessionInsights(session);
      expect(a.histogram.binEdges).toEqual(b.histogram.binEdges);
      expect(a.histogram.counts).toEqual(b.histogram.counts);
    });

    it("sums all RTs into histogram (10 bins, totals = n for multi)", () => {
      const rts = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];
      const trials = rts.map((rt, i) => makeTrial(`w${i}`, i, rt));
      const ins = buildSessionInsights(makeSession(trials));
      const total = ins.histogram.counts.reduce((a, b) => a + b, 0);
      expect(total).toBe(10);
      expect(ins.histogram.binEdges.length).toBe(11);
    });
  });

  describe("topSlow / topFast anomalies", () => {
    it("topSlowTrials sorted desc, length ≤ 5, excludes timedOut + practice", () => {
      const trials = [
        makeTrial("a", 0, 100),
        makeTrial("b", 1, 900),
        makeTrial("c", 2, 500),
        makeTrial("d", 3, 800),
        makeTrial("e", 4, 300),
        makeTrial("f", 5, 3000, { timedOut: true }),
        makeTrial("g", 6, 200, { isPractice: true }),
      ];
      const session = makeSession(trials, [
        { trialIndex: 0, flags: [] },
        { trialIndex: 1, flags: [] },
        { trialIndex: 2, flags: [] },
        { trialIndex: 3, flags: [] },
        { trialIndex: 4, flags: [] },
        { trialIndex: 5, flags: ["timeout"] },
      ]);
      const ins = buildSessionInsights(session);
      expect(ins.topSlowTrials.length).toBeLessThanOrEqual(5);
      expect(ins.topSlowTrials[0].reactionTimeMs).toBeGreaterThanOrEqual(ins.topSlowTrials[ins.topSlowTrials.length - 1].reactionTimeMs);
      expect(ins.topSlowTrials.every((r) => !r.timedOut)).toBe(true);
      expect(ins.topSlowTrials.every((r) => r.word !== "f")).toBe(true); // timedOut excluded
    });

    it("topFastTrials sorted asc, excludes timedOut", () => {
      const trials = [
        makeTrial("a", 0, 150),
        makeTrial("b", 1, 800),
        makeTrial("c", 2, 3000, { timedOut: true }),
      ];
      const session = makeSession(trials, [
        { trialIndex: 0, flags: [] },
        { trialIndex: 1, flags: [] },
        { trialIndex: 2, flags: ["timeout"] },
      ]);
      const ins = buildSessionInsights(session);
      expect(ins.topFastTrials[0].reactionTimeMs).toBeLessThanOrEqual(ins.topFastTrials[ins.topFastTrials.length - 1].reactionTimeMs);
      expect(ins.topFastTrials.every((r) => !r.timedOut)).toBe(true);
    });
  });

  describe("flaggedOtherCount", () => {
    it("excludes empty_response and timeout spellings", () => {
      const trials = [
        makeTrial("a", 0, 100, { response: "" }),
        makeTrial("b", 1, 3000, { timedOut: true }),
        makeTrial("c", 2, 800),
        makeTrial("d", 3, 200),
      ];
      const session = makeSession(trials, [
        { trialIndex: 0, flags: ["empty_response"] },
        { trialIndex: 1, flags: ["timeout"] },
        { trialIndex: 2, flags: ["timing_outlier_slow"] },
        { trialIndex: 3, flags: ["timing_outlier_fast"] },
      ]);
      const ins = buildSessionInsights(session);
      expect(ins.flaggedOtherCount).toBe(2); // only c + d
    });

    it("handles timed_out as alternate spelling", () => {
      const trials = [makeTrial("a", 0, 3000, { timedOut: true })];
      const session = makeSession(trials, [
        { trialIndex: 0, flags: ["timeout"] },
      ]);
      const ins = buildSessionInsights(session);
      expect(ins.flaggedOtherCount).toBe(0);
    });
  });

  describe("timedOut detection", () => {
    it("uses trial.timedOut field first (no flags needed)", () => {
      const trials = [makeTrial("a", 0, 3000, { timedOut: true })];
      const session = makeSession(trials, [{ trialIndex: 0, flags: [] }]);
      const ins = buildSessionInsights(session);
      expect(ins.timeoutCount).toBe(1);
      expect(ins.trialRefs[0].timedOut).toBe(true);
    });

    it("falls back to timeout flag when trial.timedOut is absent", () => {
      const trials = [makeTrial("a", 0, 3000)]; // timedOut not set
      const session = makeSession(trials, [{ trialIndex: 0, flags: ["timeout"] }]);
      const ins = buildSessionInsights(session);
      expect(ins.timeoutCount).toBe(1);
      expect(ins.trialRefs[0].timedOut).toBe(true);
    });
  });
});

// ── 0268 Tests ────────────────────────────────────────────────────────

describe("computeQualityIndex", () => {
  function insWith(overrides: Partial<Parameters<typeof computeQualityIndex>[0]>) {
    const base = buildSessionInsights(makeSession([makeTrial("a", 0, 300)]));
    return computeQualityIndex({ ...base, ...overrides });
  }

  it("perfect session → 100", () => {
    const qi = insWith({ emptyResponseCount: 0, timeoutCount: 0, flaggedOtherCount: 0 });
    expect(qi.score).toBe(100);
    expect(qi.penalties).toHaveLength(0);
  });

  it("empty responses penalise 5 pts each", () => {
    const qi = insWith({ emptyResponseCount: 2, timeoutCount: 0, flaggedOtherCount: 0 });
    expect(qi.score).toBe(90);
    expect(qi.penalties).toContainEqual({ reason: "Empty responses", points: 10 });
  });

  it("timeouts penalise 10 pts each", () => {
    const qi = insWith({ emptyResponseCount: 0, timeoutCount: 3, flaggedOtherCount: 0 });
    expect(qi.score).toBe(70);
  });

  it("flaggedOther penalises 2 pts each", () => {
    const qi = insWith({ emptyResponseCount: 0, timeoutCount: 0, flaggedOtherCount: 4 });
    expect(qi.score).toBe(92);
  });

  it("clamps to 0 (no negative scores)", () => {
    const qi = insWith({ emptyResponseCount: 10, timeoutCount: 5, flaggedOtherCount: 10 });
    expect(qi.score).toBe(0);
    expect(qi.score).toBeGreaterThanOrEqual(0);
  });

  it("clamps to 100 (no above-100)", () => {
    const qi = insWith({ emptyResponseCount: 0, timeoutCount: 0, flaggedOtherCount: 0 });
    expect(qi.score).toBeLessThanOrEqual(100);
  });
});

describe("getMicroGoal", () => {
  function insBase(): ReturnType<typeof buildSessionInsights> {
    return buildSessionInsights(makeSession([makeTrial("a", 0, 300)]));
  }

  it("empty > 2 → empty goal", () => {
    const goal = getMicroGoal({ ...insBase(), emptyResponseCount: 3 });
    expect(goal).toContain("empty responses");
  });

  it("timeouts > 0 → timeout goal", () => {
    const goal = getMicroGoal({ ...insBase(), emptyResponseCount: 0, timeoutCount: 1 });
    expect(goal).toContain("timeouts");
  });

  it("spikiness > 400 → pace goal", () => {
    const goal = getMicroGoal({ ...insBase(), emptyResponseCount: 0, timeoutCount: 0, spikinessMs: 401 });
    expect(goal).toContain("pace");
  });

  it("perfect session → stability check", () => {
    const goal = getMicroGoal({ ...insBase(), emptyResponseCount: 0, timeoutCount: 0, spikinessMs: 100 });
    expect(goal).toContain("baseline repeat");
  });
});
