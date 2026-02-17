import { describe, it, expect, beforeEach } from "vitest";
import { localStorageSessionStore } from "@/infra/localStorageSessionStore";
import type { SessionResult } from "@/domain/types";
import type { DraftSession } from "@/domain/sessionStore";
import { scoreSession } from "@/domain/scoring";

/**
 * Ticket 0188 — Draft/resume end-to-end flow test.
 * Proves draft create → persist → resume → complete round-trip.
 */

function makeDraft(): DraftSession {
  return {
    id: "draft-e2e-1",
    stimulusListId: "demo-10",
    stimulusListVersion: "1.0.0",
    orderPolicy: "fixed",
    seedUsed: null,
    wordList: ["sun", "moon", "star"],
    practiceWords: [],
    stimulusOrder: ["sun", "moon", "star"],
    trials: [
      {
        stimulus: { word: "sun", index: 0 },
        association: {
          response: "bright",
          reactionTimeMs: 400,
          tFirstKeyMs: 150,
          backspaceCount: 0,
          editCount: 1,
          compositionCount: 0,
        },
        isPractice: false,
      },
    ],
    currentIndex: 1,
    savedAt: new Date().toISOString(),
    startedAt: "2026-02-17T10:00:00.000Z",
  };
}

describe("Draft/resume end-to-end flow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads a draft", async () => {
    const draft = makeDraft();
    await localStorageSessionStore.saveDraft(draft);
    const loaded = await localStorageSessionStore.loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(draft.id);
    expect(loaded!.trials).toHaveLength(1);
    expect(loaded!.currentIndex).toBe(1);
    expect(loaded!.startedAt).toBe("2026-02-17T10:00:00.000Z");
  });

  it("resumed draft completes with consistent metadata", async () => {
    const draft = makeDraft();
    await localStorageSessionStore.saveDraft(draft);

    // Simulate "reload" by reading draft back
    const resumed = await localStorageSessionStore.loadDraft();
    expect(resumed).not.toBeNull();

    // Complete the session with remaining trials
    const allTrials = [
      ...resumed!.trials,
      {
        stimulus: { word: "moon", index: 1 },
        association: {
          response: "night",
          reactionTimeMs: 350,
          tFirstKeyMs: 120,
          backspaceCount: 0,
          editCount: 1,
          compositionCount: 0,
        },
        isPractice: false,
      },
      {
        stimulus: { word: "star", index: 2 },
        association: {
          response: "sky",
          reactionTimeMs: 300,
          tFirstKeyMs: 100,
          backspaceCount: 0,
          editCount: 1,
          compositionCount: 0,
        },
        isPractice: false,
      },
    ];

    const scoring = scoreSession(allTrials);
    const completedAt = "2026-02-17T10:05:00.000Z";

    const session: SessionResult = {
      id: resumed!.id,
      config: {
        stimulusListId: resumed!.stimulusListId,
        stimulusListVersion: resumed!.stimulusListVersion,
        maxResponseTimeMs: 0,
        orderPolicy: resumed!.orderPolicy,
        seed: resumed!.seedUsed,
      },
      trials: allTrials,
      startedAt: resumed!.startedAt!,
      completedAt,
      scoring,
      seedUsed: resumed!.seedUsed,
      stimulusOrder: resumed!.stimulusOrder as string[],
      provenanceSnapshot: null,
      sessionFingerprint: null,
      scoringVersion: "scoring_v2_mad_3.5",
      appVersion: "1.0.0",
    };

    await localStorageSessionStore.save(session);
    await localStorageSessionStore.deleteDraft();

    // Verify persisted result
    const loaded = await localStorageSessionStore.load(session.id);
    expect(loaded).toBeDefined();
    expect(loaded!.startedAt).toBe("2026-02-17T10:00:00.000Z");
    expect(loaded!.completedAt).toBe(completedAt);
    expect(loaded!.startedAt < loaded!.completedAt).toBe(true);
    expect(loaded!.scoringVersion).toBe("scoring_v2_mad_3.5");
    expect(loaded!.appVersion).toBe("1.0.0");

    // Draft should be gone
    const draftAfter = await localStorageSessionStore.loadDraft();
    expect(draftAfter).toBeNull();
  });
});
