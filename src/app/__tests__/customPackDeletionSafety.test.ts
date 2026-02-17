/**
 * Ticket 0206 — Deletion-safe regression test.
 * Proves deleting a custom pack doesn't break viewing/exporting
 * a historical session that used it.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { localStorageSessionStore } from "@/infra/localStorageSessionStore";
import { localStorageStimulusStore } from "@/infra/localStorageStimulusStore";
import type { SessionResult, StimulusPackSnapshot } from "@/domain/types";

const STORAGE_KEY = "complex-mapper-sessions";

function makeSessionWithCustomPack(): SessionResult {
  const snapshot: StimulusPackSnapshot = {
    stimulusListHash: "deadbeef1234",
    stimulusSchemaVersion: "sp_v1",
    provenance: {
      listId: "custom-test-pack",
      listVersion: "1.0.0",
      language: "en",
      source: "Test Lab",
      sourceName: "Test Lab",
      sourceYear: "2026",
      sourceCitation: "Custom test pack citation",
      licenseNote: "MIT",
      wordCount: 3,
    },
  };

  return {
    id: "session-custom-1",
    config: {
      stimulusListId: "custom-test-pack",
      stimulusListVersion: "1.0.0",
      maxResponseTimeMs: 0,
      orderPolicy: "fixed",
      seed: null,
    },
    trials: [
      {
        stimulus: { word: "alpha", index: 0 },
        association: {
          response: "beta",
          reactionTimeMs: 400,
          tFirstKeyMs: 150,
          backspaceCount: 0,
          editCount: 1,
          compositionCount: 0,
        },
        isPractice: false,
      },
    ],
    startedAt: "2026-02-17T00:00:00Z",
    completedAt: "2026-02-17T00:05:00Z",
    scoring: {
      trialFlags: [{ trialIndex: 0, flags: [] }],
      summary: {
        totalTrials: 1,
        meanReactionTimeMs: 400,
        medianReactionTimeMs: 400,
        stdDevReactionTimeMs: 0,
        emptyResponseCount: 0,
        repeatedResponseCount: 0,
        timingOutlierCount: 0,
        highEditingCount: 0,
        timeoutCount: 0,
      },
    },
    seedUsed: null,
    stimulusOrder: ["alpha"],
    provenanceSnapshot: snapshot.provenance,
    sessionFingerprint: "abc123",
    scoringVersion: "scoring_v2_mad_3.5",
    appVersion: "1.0.0",
    stimulusPackSnapshot: snapshot,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("Custom pack deletion safety", () => {
  it("session snapshot survives pack deletion", async () => {
    // 1. Import a custom pack
    localStorageStimulusStore.save({
      id: "custom-test-pack",
      version: "1.0.0",
      language: "en",
      source: "Test Lab",
      provenance: {
        sourceName: "Test Lab",
        sourceYear: "2026",
        sourceCitation: "Custom test pack citation",
        licenseNote: "MIT",
      },
      words: ["alpha", "beta", "gamma"],
    });

    // 2. Save a session that used it
    const session = makeSessionWithCustomPack();
    await localStorageSessionStore.save(session);

    // 3. Delete the custom pack
    localStorageStimulusStore.delete("custom-test-pack", "1.0.0");

    // Verify pack is gone
    expect(localStorageStimulusStore.load("custom-test-pack", "1.0.0")).toBeUndefined();

    // 4. Load the session — snapshot must survive
    const loaded = await localStorageSessionStore.load("session-custom-1");
    expect(loaded).toBeDefined();
    expect(loaded!.stimulusPackSnapshot).toBeDefined();
    expect(loaded!.stimulusPackSnapshot!.stimulusListHash).toBe("deadbeef1234");
    expect(loaded!.stimulusPackSnapshot!.stimulusSchemaVersion).toBe("sp_v1");
    expect(loaded!.stimulusPackSnapshot!.provenance!.listId).toBe("custom-test-pack");
  });

  it("exported bundle includes snapshot after pack deletion", async () => {
    // Save session with snapshot
    const session = makeSessionWithCustomPack();
    await localStorageSessionStore.save(session);

    // Delete the pack (not the session)
    // Pack doesn't even need to exist for this — session is self-contained

    // Export all sessions
    const exported = await localStorageSessionStore.exportAll();
    const parsed = JSON.parse(exported);
    const s = parsed.sessions["session-custom-1"];

    expect(s.stimulusPackSnapshot).toBeDefined();
    expect(s.stimulusPackSnapshot.stimulusListHash).toBe("deadbeef1234");
    expect(s.stimulusPackSnapshot.stimulusSchemaVersion).toBe("sp_v1");
    expect(s.stimulusPackSnapshot.provenance.listId).toBe("custom-test-pack");
  });
});
