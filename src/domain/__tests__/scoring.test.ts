import { describe, it, expect } from "vitest";
import { scoreSession } from "../scoring";
import type { Trial } from "../types";

function makeTrial(
  word: string,
  response: string,
  reactionTimeMs: number,
  index = 0,
  isPractice = false,
  overrides?: { tFirstKeyMs?: number | null; backspaceCount?: number; editCount?: number },
): Trial {
  return {
    stimulus: { word, index },
    association: {
      response,
      reactionTimeMs,
      tFirstKeyMs: overrides?.tFirstKeyMs ?? null,
      backspaceCount: overrides?.backspaceCount ?? 0,
      editCount: overrides?.editCount ?? 0,
    },
    isPractice,
  };
}

describe("scoreSession", () => {
  it("returns empty scoring for zero trials", () => {
    const result = scoreSession([]);
    expect(result.trialFlags).toHaveLength(0);
    expect(result.summary.totalTrials).toBe(0);
  });

  it("flags empty responses", () => {
    const trials = [
      makeTrial("tree", "", 500, 0),
      makeTrial("house", "home", 600, 1),
      makeTrial("water", "  ", 700, 2),
    ];
    const result = scoreSession(trials);
    const emptyFlags = result.trialFlags.filter((f) =>
      f.flags.includes("empty_response"),
    );
    expect(emptyFlags).toHaveLength(2);
    expect(result.summary.emptyResponseCount).toBe(2);
  });

  it("flags repeated responses", () => {
    const trials = [
      makeTrial("tree", "green", 500, 0),
      makeTrial("house", "green", 600, 1),
      makeTrial("water", "blue", 700, 2),
      makeTrial("sky", "green", 650, 3),
    ];
    const result = scoreSession(trials);
    const repeated = result.trialFlags.filter((f) =>
      f.flags.includes("repeated_response"),
    );
    expect(repeated).toHaveLength(2); // indices 1 and 3
    expect(result.summary.repeatedResponseCount).toBe(2);
  });

  it("detects timing outliers (slow)", () => {
    // Create trials with a very extreme outlier
    const trials = [
      makeTrial("a", "x", 500, 0),
      makeTrial("b", "y", 500, 1),
      makeTrial("c", "z", 500, 2),
      makeTrial("d", "w", 500, 3),
      makeTrial("e", "v", 500, 4),
      makeTrial("f", "u", 500, 5),
      makeTrial("g", "t", 15000, 6), // extreme outlier
    ];
    const result = scoreSession(trials);
    const slow = result.trialFlags.filter((f) =>
      f.flags.includes("timing_outlier_slow"),
    );
    expect(slow.length).toBeGreaterThanOrEqual(1);
    expect(slow.some((s) => s.trialIndex === 6)).toBe(true);
  });

  it("detects timing outliers (fast)", () => {
    const trials = [
      makeTrial("a", "x", 500, 0),
      makeTrial("b", "y", 520, 1),
      makeTrial("c", "z", 510, 2),
      makeTrial("d", "w", 50, 3), // suspiciously fast
    ];
    const result = scoreSession(trials);
    const fast = result.trialFlags.filter((f) =>
      f.flags.includes("timing_outlier_fast"),
    );
    expect(fast.length).toBeGreaterThanOrEqual(1);
  });

  it("computes correct summary stats", () => {
    const trials = [
      makeTrial("a", "x", 400, 0),
      makeTrial("b", "y", 600, 1),
    ];
    const result = scoreSession(trials);
    expect(result.summary.totalTrials).toBe(2);
    expect(result.summary.meanReactionTimeMs).toBe(500);
    expect(result.summary.medianReactionTimeMs).toBe(500);
  });

  it("is deterministic — same input produces same output", () => {
    const trials = [
      makeTrial("tree", "green", 500, 0),
      makeTrial("house", "", 600, 1),
      makeTrial("water", "green", 700, 2),
    ];
    const r1 = scoreSession(trials);
    const r2 = scoreSession(trials);
    expect(r1).toEqual(r2);
  });

  it("excludes practice trials from scoring", () => {
    const trials = [
      makeTrial("sun", "bright", 800, 0, true),
      makeTrial("table", "chair", 900, 1, true),
      makeTrial("road", "car", 1000, 2, true),
      makeTrial("tree", "leaf", 500, 3, false),
      makeTrial("house", "home", 600, 4, false),
    ];
    const result = scoreSession(trials);
    expect(result.summary.totalTrials).toBe(2);
    expect(result.trialFlags).toHaveLength(2);
  });

  it("returns empty scoring when all trials are practice", () => {
    const trials = [
      makeTrial("sun", "bright", 500, 0, true),
      makeTrial("table", "chair", 600, 1, true),
    ];
    const result = scoreSession(trials);
    expect(result.summary.totalTrials).toBe(0);
    expect(result.trialFlags).toHaveLength(0);
  });

  it("does not flag practice trial repeats in scored trials", () => {
    const trials = [
      makeTrial("sun", "green", 500, 0, true),
      makeTrial("tree", "green", 500, 1, false),
      makeTrial("house", "blue", 600, 2, false),
    ];
    const result = scoreSession(trials);
    const repeated = result.trialFlags.filter((f) =>
      f.flags.includes("repeated_response"),
    );
    expect(repeated).toHaveLength(0);
  });

  it("flags high editing when backspaceCount exceeds threshold", () => {
    const trials = [
      makeTrial("a", "x", 500, 0, false, { backspaceCount: 0 }),
      makeTrial("b", "y", 500, 1, false, { backspaceCount: 5 }),
      makeTrial("c", "z", 500, 2, false, { backspaceCount: 4 }),
    ];
    const result = scoreSession(trials);
    const highEdit = result.trialFlags.filter((f) =>
      f.flags.includes("high_editing"),
    );
    expect(highEdit).toHaveLength(2);
    expect(result.summary.highEditingCount).toBe(2);
  });

  it("does not flag high editing at or below threshold", () => {
    const trials = [
      makeTrial("a", "x", 500, 0, false, { backspaceCount: 3 }),
      makeTrial("b", "y", 500, 1, false, { backspaceCount: 0 }),
    ];
    const result = scoreSession(trials);
    const highEdit = result.trialFlags.filter((f) =>
      f.flags.includes("high_editing"),
    );
    expect(highEdit).toHaveLength(0);
  });

  it("preserves tFirstKeyMs and editCount in trial data", () => {
    const trials = [
      makeTrial("a", "x", 500, 0, false, { tFirstKeyMs: 150, editCount: 3 }),
    ];
    const result = scoreSession(trials);
    expect(result.summary.totalTrials).toBe(1);
    // Metrics are on trial data, not scoring — just verify scoring doesn't break
    expect(result.trialFlags).toHaveLength(1);
  });
});
