/**
 * breakLogic.test.ts — Tests that break triggers exactly once per threshold crossing.
 * Pure logic test (no React rendering) — validates the effect guard conditions.
 */

import { describe, it, expect } from "vitest";

/**
 * Simulates the break effect guard logic from RunningTrial.tsx.
 * Returns true if the effect would call setOnBreak(true).
 */
function shouldTriggerBreak(params: {
  breakEveryN: number;
  isPractice: boolean;
  scoredCompleted: number;
  onBreak: boolean;
  lastBreakAt: number;
}): boolean {
  const { breakEveryN, isPractice, scoredCompleted, onBreak, lastBreakAt } = params;
  return (
    breakEveryN > 0 &&
    !isPractice &&
    scoredCompleted > 0 &&
    scoredCompleted % breakEveryN === 0 &&
    !onBreak &&
    lastBreakAt !== scoredCompleted
  );
}

describe("Break logic guards", () => {
  const base = {
    breakEveryN: 2,
    isPractice: false,
    scoredCompleted: 2,
    onBreak: false,
    lastBreakAt: 0,
  };

  it("triggers break at threshold", () => {
    expect(shouldTriggerBreak(base)).toBe(true);
  });

  it("does NOT trigger during practice", () => {
    expect(shouldTriggerBreak({ ...base, isPractice: true })).toBe(false);
  });

  it("does NOT trigger when already on break", () => {
    expect(shouldTriggerBreak({ ...base, onBreak: true })).toBe(false);
  });

  it("does NOT trigger when lastBreakAt equals scoredCompleted (prevents duplicate)", () => {
    expect(shouldTriggerBreak({ ...base, lastBreakAt: 2 })).toBe(false);
  });

  it("does NOT trigger at scoredCompleted=0", () => {
    expect(shouldTriggerBreak({ ...base, scoredCompleted: 0 })).toBe(false);
  });

  it("does NOT trigger at non-threshold values", () => {
    expect(shouldTriggerBreak({ ...base, scoredCompleted: 1 })).toBe(false);
    expect(shouldTriggerBreak({ ...base, scoredCompleted: 3 })).toBe(false);
  });

  it("triggers at next threshold (scoredCompleted=4)", () => {
    expect(
      shouldTriggerBreak({ ...base, scoredCompleted: 4, lastBreakAt: 2 }),
    ).toBe(true);
  });

  it("Strict Mode double-fire: second call with lastBreakAt already set does NOT trigger", () => {
    // First call triggers and sets lastBreakAt = scoredCompleted
    const firstCall = shouldTriggerBreak(base);
    expect(firstCall).toBe(true);
    // Simulate: effect sets lastBreakAt = scoredCompleted
    const secondCall = shouldTriggerBreak({ ...base, lastBreakAt: 2 });
    expect(secondCall).toBe(false);
  });

  it("breakEveryN=0 disables breaks", () => {
    expect(shouldTriggerBreak({ ...base, breakEveryN: 0 })).toBe(false);
  });
});
