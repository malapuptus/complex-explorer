/**
 * Ticket 0236 — Atomic save tests.
 * Simulates partial writes and ensures store recovers.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const STORAGE_KEY = "complex-mapper-sessions";
const STAGING_KEY = STORAGE_KEY + "__staging";

describe("Atomic localStorage saves (0236)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("normal save writes staging then main then removes staging", async () => {
    const { localStorageSessionStore } = await import("@/infra");
    const session = {
      id: "atomic-1",
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
      stimulusOrder: [] as string[],
      provenanceSnapshot: null,
      sessionFingerprint: null,
      scoringVersion: null,
      appVersion: null,
      stimulusPackSnapshot: null,
    };
    await localStorageSessionStore.save(session);

    // Main should exist, staging should be cleaned up
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(STAGING_KEY)).toBeNull();
  });

  it("staging-only state (crash before commit) recovers empty", async () => {
    // Simulate crash: staging written but main never updated
    localStorage.setItem(STAGING_KEY, JSON.stringify({ schemaVersion: 3, sessions: { "crash-1": {} } }));
    // Main doesn't exist — the staging is incomplete/abandoned

    const { localStorageSessionStore } = await import("@/infra");
    const list = await localStorageSessionStore.list();
    // Should recover with empty store (staging discarded)
    expect(list).toEqual([]);
    expect(localStorage.getItem(STAGING_KEY)).toBeNull();
  });

  it("staging leftover with valid main ignores staging", async () => {
    const envelope = {
      schemaVersion: 3,
      sessions: {
        "s1": {
          id: "s1",
          config: { stimulusListId: "demo-10", stimulusListVersion: "1.0.0", maxResponseTimeMs: 0, orderPolicy: "fixed", seed: null },
          trials: [], startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z",
          scoring: { trialFlags: [], summary: { totalTrials: 0, meanReactionTimeMs: 0, medianReactionTimeMs: 0, stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0, timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0 } },
          seedUsed: null, stimulusOrder: [], provenanceSnapshot: null, sessionFingerprint: null, scoringVersion: null, appVersion: null, stimulusPackSnapshot: null,
        },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    localStorage.setItem(STAGING_KEY, "corrupted staging data");

    const { localStorageSessionStore } = await import("@/infra");
    const list = await localStorageSessionStore.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("s1");
    // Staging cleaned up
    expect(localStorage.getItem(STAGING_KEY)).toBeNull();
  });

  it("quota error mid-write preserves previous good state", async () => {
    const { localStorageSessionStore } = await import("@/infra");

    // Save a good session first
    const good = {
      id: "good-1",
      config: { stimulusListId: "demo-10", stimulusListVersion: "1.0.0", maxResponseTimeMs: 0, orderPolicy: "fixed" as const, seed: null },
      trials: [], startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z",
      scoring: { trialFlags: [], summary: { totalTrials: 0, meanReactionTimeMs: 0, medianReactionTimeMs: 0, stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0, timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0 } },
      seedUsed: null, stimulusOrder: [] as string[], provenanceSnapshot: null, sessionFingerprint: null, scoringVersion: null, appVersion: null, stimulusPackSnapshot: null,
    };
    await localStorageSessionStore.save(good);

    // Now simulate quota error on next save (fail on staging write)
    const origSetItem = Storage.prototype.setItem;
    let callCount = 0;
    Storage.prototype.setItem = vi.fn((...args) => {
      callCount++;
      if (callCount >= 1) throw new DOMException("quota exceeded", "QuotaExceededError");
      return origSetItem.apply(localStorage, args as [string, string]);
    });

    await expect(localStorageSessionStore.save({
      ...good, id: "bad-1",
    })).rejects.toThrow();

    Storage.prototype.setItem = origSetItem;

    // Previous good state should be preserved
    const list = await localStorageSessionStore.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("good-1");
  });
});
