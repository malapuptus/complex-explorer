/**
 * Tests for simulateSession.ts — Ticket 0268.
 */

import { describe, it, expect } from "vitest";
import { simulateSession } from "../simulateSession";
import { buildSessionInsights } from "../sessionInsights";

describe("simulateSession", () => {
  it("is deterministic for a fixed seed", () => {
    const a = simulateSession(42);
    const b = simulateSession(42);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("produces the expected trial count (default 10)", () => {
    const result = simulateSession(1);
    expect(result.trials.length).toBe(10);
  });

  it("produces correct trial count when wordCount supplied", () => {
    const result = simulateSession(1, 5);
    expect(result.trials.length).toBe(5);
  });

  it("scoring exists and does not throw", () => {
    const result = simulateSession(99);
    expect(result.scoring).toBeDefined();
    expect(result.scoring.trialFlags.length).toBeGreaterThan(0);
  });

  it("stimulusPackSnapshot exists (charts work without pack store)", () => {
    const result = simulateSession(7);
    expect(result.stimulusPackSnapshot).toBeDefined();
  });

  it("stimulusOrder is non-empty", () => {
    const result = simulateSession(3);
    expect(result.stimulusOrder.length).toBeGreaterThan(0);
  });

  it("some trials have non-zero RT", () => {
    const result = simulateSession(17);
    const nonZero = result.trials.filter((t) => t.association.reactionTimeMs > 0);
    expect(nonZero.length).toBeGreaterThan(0);
  });

  it("id is deterministic and includes seed", () => {
    const result = simulateSession(42);
    expect(result.id).toBe("sim_42");
  });

  it("buildSessionInsights runs without throwing", () => {
    const result = simulateSession(55);
    expect(() => buildSessionInsights(result)).not.toThrow();
  });
});
