/**
 * Ticket 0225 — Quota exceeded handling tests.
 * Simulates localStorage quota errors and asserts deterministic behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Quota exceeded handling", () => {
  const origSetItem = Storage.prototype.setItem;

  afterEach(() => {
    Storage.prototype.setItem = origSetItem;
    localStorage.clear();
  });

  it("session save throws QuotaExceededError when storage is full", async () => {
    // Dynamically import to get fresh module
    const { localStorageSessionStore } = await import("@/infra");

    // Mock setItem to throw QuotaExceededError
    Storage.prototype.setItem = vi.fn(() => {
      const err = new DOMException("quota exceeded", "QuotaExceededError");
      throw err;
    });

    const session = {
      id: "quota-test",
      config: {
        stimulusListId: "demo-10", stimulusListVersion: "1.0.0",
        maxResponseTimeMs: 0, orderPolicy: "fixed" as const, seed: null,
      },
      trials: [],
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "2026-01-01T00:01:00Z",
      scoring: { trialFlags: [], summary: {
        totalTrials: 0, meanReactionTimeMs: 0, medianReactionTimeMs: 0,
        stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0,
        timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0,
      }},
      seedUsed: null,
      stimulusOrder: [],
      provenanceSnapshot: null,
      sessionFingerprint: null,
      scoringVersion: null,
      appVersion: null,
      stimulusPackSnapshot: null,
    };

    await expect(localStorageSessionStore.save(session)).rejects.toThrow();
  });

  it("pack save throws QuotaExceededError when storage is full", async () => {
    const { localStorageStimulusStore } = await import("@/infra");

    Storage.prototype.setItem = vi.fn(() => {
      throw new DOMException("quota exceeded", "QuotaExceededError");
    });

    const pack = {
      id: "test-pack", version: "1.0.0", language: "en", source: "test",
      provenance: { sourceName: "T", sourceYear: "2026", sourceCitation: "c", licenseNote: "l" },
      words: ["a", "b", "c"],
      stimulusSchemaVersion: "sp_v1",
    };

    expect(() => localStorageStimulusStore.save(pack)).toThrow();
  });

  it("estimateBytes returns 0 when storage is empty", async () => {
    const { localStorageSessionStore, localStorageStimulusStore } = await import("@/infra");
    localStorage.clear();
    expect(localStorageSessionStore.estimateBytes()).toBe(0);
    expect(localStorageStimulusStore.estimateBytes()).toBe(0);
  });
});
