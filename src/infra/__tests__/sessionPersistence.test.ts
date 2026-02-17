/**
 * Persistence tests — proves scoringVersion and startedAt survive
 * save/load and draft round-trips via localStorageSessionStore.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { localStorageSessionStore } from "../localStorageSessionStore";

const STORAGE_KEY = "complex-mapper-sessions";
const DRAFT_KEY = "complex-mapper-draft";

function makeFakeResult(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-1",
    config: {
      stimulusListId: "demo-10",
      stimulusListVersion: "1.0.0",
      maxResponseTimeMs: 0,
      orderPolicy: "fixed",
      seed: null,
    },
    trials: [],
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-01T00:05:00Z",
    scoring: { trialFlags: [], summary: { totalTrials: 0, meanReactionTimeMs: 0, medianReactionTimeMs: 0, stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0, timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0 } },
    seedUsed: null,
    stimulusOrder: [],
    provenanceSnapshot: null,
    sessionFingerprint: null,
    scoringVersion: "scoring_v2_mad_3.5",
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("scoringVersion persistence", () => {
  it("round-trips scoringVersion through save/load", async () => {
    const result = makeFakeResult({ scoringVersion: "scoring_v2_mad_3.5" });
    await localStorageSessionStore.save(result as never);
    const loaded = await localStorageSessionStore.load("test-1");
    expect(loaded?.scoringVersion).toBe("scoring_v2_mad_3.5");
  });

  it("migrates legacy session without scoringVersion to null", async () => {
    // Write raw legacy data without scoringVersion
    const legacy = makeFakeResult();
    delete (legacy as Record<string, unknown>).scoringVersion;
    const envelope = { schemaVersion: 2, sessions: { "test-1": legacy } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));

    const loaded = await localStorageSessionStore.load("test-1");
    expect(loaded?.scoringVersion).toBeNull();
  });
});

describe("draft startedAt persistence", () => {
  it("preserves startedAt through draft save/load", async () => {
    const draft = {
      id: "draft-1",
      stimulusListId: "demo-10",
      stimulusListVersion: "1.0.0",
      orderPolicy: "fixed" as const,
      seedUsed: null,
      wordList: ["a", "b"],
      practiceWords: ["x"],
      stimulusOrder: ["a", "b"],
      trials: [],
      currentIndex: 1,
      savedAt: "2026-01-01T00:01:00Z",
      startedAt: "2026-01-01T00:00:00Z",
    };
    await localStorageSessionStore.saveDraft(draft);
    const loaded = await localStorageSessionStore.loadDraft();
    expect(loaded?.startedAt).toBe("2026-01-01T00:00:00Z");
  });

  it("returns undefined startedAt for drafts without it", async () => {
    const raw = {
      id: "draft-2",
      stimulusListId: "demo-10",
      stimulusListVersion: "1.0.0",
      orderPolicy: "fixed",
      seedUsed: null,
      wordList: ["a"],
      practiceWords: [],
      stimulusOrder: ["a"],
      trials: [],
      currentIndex: 0,
      savedAt: "2026-01-01T00:01:00Z",
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(raw));
    const loaded = await localStorageSessionStore.loadDraft();
    expect(loaded?.startedAt).toBeUndefined();
  });
});
