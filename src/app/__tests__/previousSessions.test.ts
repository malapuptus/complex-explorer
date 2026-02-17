import { describe, it, expect, beforeEach } from "vitest";
import { localStorageSessionStore } from "@/infra/localStorageSessionStore";
import type { SessionResult } from "@/domain/types";

/**
 * Ticket 0191 — Previous Sessions list integrity test.
 * Verifies ordering, load, and deleteAll behaviors.
 */

function makeSession(id: string, completedAt: string): SessionResult {
  return {
    id,
    config: {
      stimulusListId: "demo-10",
      stimulusListVersion: "1.0.0",
      maxResponseTimeMs: 0,
      orderPolicy: "fixed",
      seed: null,
    },
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
    startedAt: "2026-02-17T10:00:00Z",
    completedAt,
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
    stimulusOrder: ["sun"],
    provenanceSnapshot: null,
    sessionFingerprint: null,
    scoringVersion: "scoring_v2_mad_3.5",
    appVersion: "1.0.0",
  };
}

describe("Previous Sessions list integrity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("lists sessions in newest-first order", async () => {
    const older = makeSession("s-old", "2026-02-17T09:00:00Z");
    const newer = makeSession("s-new", "2026-02-17T11:00:00Z");
    await localStorageSessionStore.save(older);
    await localStorageSessionStore.save(newer);

    const list = await localStorageSessionStore.list();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe("s-new");
    expect(list[1].id).toBe("s-old");
  });

  it("load returns correct session with metadata", async () => {
    const session = makeSession("s-meta", "2026-02-17T10:00:00Z");
    await localStorageSessionStore.save(session);

    const loaded = await localStorageSessionStore.load("s-meta");
    expect(loaded).toBeDefined();
    expect(loaded!.scoringVersion).toBe("scoring_v2_mad_3.5");
    expect(loaded!.appVersion).toBe("1.0.0");
    expect(loaded!.config.stimulusListId).toBe("demo-10");
  });

  it("deleteAll clears all sessions", async () => {
    await localStorageSessionStore.save(makeSession("s1", "2026-02-17T09:00:00Z"));
    await localStorageSessionStore.save(makeSession("s2", "2026-02-17T10:00:00Z"));

    await localStorageSessionStore.deleteAll();
    const list = await localStorageSessionStore.list();
    expect(list).toHaveLength(0);
  });

  it("delete removes only the targeted session", async () => {
    await localStorageSessionStore.save(makeSession("s1", "2026-02-17T09:00:00Z"));
    await localStorageSessionStore.save(makeSession("s2", "2026-02-17T10:00:00Z"));

    await localStorageSessionStore.delete("s1");
    const list = await localStorageSessionStore.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("s2");
  });
});
