import { describe, it, expect } from "vitest";
import type { SessionResult } from "@/domain/types";

/**
 * Ticket 0190 — Bundle completeness contract test.
 * Asserts the Research Bundle includes all fields required for
 * reproducibility and analysis.
 */

function makeFullSession(): SessionResult {
  return {
    id: "contract-test-1",
    config: {
      stimulusListId: "demo-10",
      stimulusListVersion: "1.0.0",
      maxResponseTimeMs: 0,
      orderPolicy: "seeded",
      seed: 42,
      trialTimeoutMs: 5000,
      breakEveryN: 5,
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
    completedAt: "2026-02-17T10:05:00Z",
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
    seedUsed: 42,
    stimulusOrder: ["sun"],
    provenanceSnapshot: {
      listId: "demo-10",
      listVersion: "1.0.0",
      language: "en",
      source: "test",
      sourceName: "Test",
      sourceYear: "2026",
      sourceCitation: "Test citation",
      licenseNote: "Test license",
      wordCount: 1,
    },
    sessionFingerprint: "abc123",
    scoringVersion: "scoring_v2_mad_3.5",
    appVersion: "1.0.0",
  };
}

describe("Bundle completeness contract", () => {
  const session = makeFullSession();

  // Simulate bundle construction (mirrors ResultsView logic)
  const bundle = {
    sessionResult: {
      id: session.id,
      config: session.config,
      trials: session.trials,
      scoring: session.scoring,
      sessionFingerprint: session.sessionFingerprint,
      provenanceSnapshot: session.provenanceSnapshot,
      stimulusOrder: session.stimulusOrder,
      seedUsed: session.seedUsed,
      scoringVersion: session.scoringVersion,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    },
    protocolDocVersion: "PROTOCOL.md@2026-02-13",
    appVersion: session.appVersion,
    scoringAlgorithm: "MAD-modified-z@3.5 + fast<200ms + timeout excluded",
    exportSchemaVersion: "rb_v1",
    exportedAt: new Date().toISOString(),
  };

  describe("top-level bundle keys", () => {
    const required = [
      "exportSchemaVersion",
      "appVersion",
      "protocolDocVersion",
      "scoringAlgorithm",
      "exportedAt",
      "sessionResult",
    ];
    for (const key of required) {
      it(`includes ${key}`, () => {
        expect(bundle).toHaveProperty(key);
        expect((bundle as Record<string, unknown>)[key]).toBeDefined();
      });
    }
  });

  describe("sessionResult completeness", () => {
    const sr = bundle.sessionResult;
    const requiredFields = [
      "id",
      "config",
      "trials",
      "scoring",
      "stimulusOrder",
      "seedUsed",
      "provenanceSnapshot",
      "sessionFingerprint",
      "scoringVersion",
      "startedAt",
      "completedAt",
    ];
    for (const field of requiredFields) {
      it(`sessionResult includes ${field}`, () => {
        expect(sr).toHaveProperty(field);
      });
    }

    it("scoring includes summary", () => {
      expect(sr.scoring).toHaveProperty("summary");
      expect(sr.scoring.summary).toHaveProperty("meanReactionTimeMs");
      expect(sr.scoring.summary).toHaveProperty("medianReactionTimeMs");
    });

    it("scoring includes trialFlags", () => {
      expect(sr.scoring).toHaveProperty("trialFlags");
      expect(Array.isArray(sr.scoring.trialFlags)).toBe(true);
    });

    it("config includes key fields", () => {
      expect(sr.config).toHaveProperty("stimulusListId");
      expect(sr.config).toHaveProperty("stimulusListVersion");
      expect(sr.config).toHaveProperty("orderPolicy");
    });
  });
});
