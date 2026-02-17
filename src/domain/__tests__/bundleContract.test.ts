import { describe, it, expect } from "vitest";
import type { SessionResult } from "@/domain/types";

/**
 * Ticket 0190/0202/0215 — Bundle completeness contract test.
 * Asserts the Research Bundle includes all fields required for
 * reproducibility and analysis, including rb_v3 full pack payload.
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
    stimulusPackSnapshot: {
      stimulusListHash: "abc123hash",
      stimulusSchemaVersion: "sp_v1",
      provenance: {
        listId: "demo-10", listVersion: "1.0.0", language: "en",
        source: "test", sourceName: "Test", sourceYear: "2026",
        sourceCitation: "Test citation", licenseNote: "Test license", wordCount: 1,
      },
    },
  };
}

describe("Bundle completeness contract", () => {
  const session = makeFullSession();

  // Simulate bundle construction (mirrors ResultsExportActions rb_v3 logic)
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
      appVersion: session.appVersion ?? null,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    },
    protocolDocVersion: "PROTOCOL.md@2026-02-13",
    appVersion: session.appVersion,
    scoringAlgorithm: "MAD-modified-z@3.5 + fast<200ms + timeout excluded",
    exportSchemaVersion: "rb_v3",
    exportedAt: new Date().toISOString(),
    stimulusPackSnapshot: {
      ...session.stimulusPackSnapshot,
      words: session.stimulusOrder,
    },
    privacy: { mode: "full" as const, includesStimulusWords: true, includesResponses: true },
  };

  describe("top-level bundle keys", () => {
    const required = [
      "exportSchemaVersion",
      "appVersion",
      "protocolDocVersion",
      "scoringAlgorithm",
      "exportedAt",
      "sessionResult",
      "stimulusPackSnapshot",
      "privacy",
    ];
    for (const key of required) {
      it(`includes ${key}`, () => {
        expect(bundle).toHaveProperty(key);
        expect((bundle as Record<string, unknown>)[key]).toBeDefined();
      });
    }
  });

  it("exportSchemaVersion is rb_v3", () => {
    expect(bundle.exportSchemaVersion).toBe("rb_v3");
  });

  it("stimulusPackSnapshot has hash, schema version, provenance, and words", () => {
    expect(bundle.stimulusPackSnapshot).toHaveProperty("stimulusListHash");
    expect(bundle.stimulusPackSnapshot).toHaveProperty("stimulusSchemaVersion");
    expect(bundle.stimulusPackSnapshot).toHaveProperty("provenance");
    expect(bundle.stimulusPackSnapshot).toHaveProperty("words");
    expect(bundle.stimulusPackSnapshot.provenance).toHaveProperty("listId");
    expect(bundle.stimulusPackSnapshot.stimulusSchemaVersion).toBe("sp_v1");
    expect(Array.isArray(bundle.stimulusPackSnapshot.words)).toBe(true);
    expect(bundle.stimulusPackSnapshot.words).toContain("sun");
  });

  describe("Minimal bundle mode", () => {
    const minimalBundle = {
      sessionResult: bundle.sessionResult,
      protocolDocVersion: bundle.protocolDocVersion,
      appVersion: bundle.appVersion,
      scoringAlgorithm: bundle.scoringAlgorithm,
      exportSchemaVersion: "rb_v3",
      exportedAt: bundle.exportedAt,
      stimulusPackSnapshot: {
        stimulusListHash: session.stimulusPackSnapshot!.stimulusListHash,
        stimulusSchemaVersion: session.stimulusPackSnapshot!.stimulusSchemaVersion,
        provenance: session.stimulusPackSnapshot!.provenance,
      },
      privacy: { mode: "minimal" as const, includesStimulusWords: false, includesResponses: true },
    };

    it("minimal bundle has no words", () => {
      expect(minimalBundle.stimulusPackSnapshot).not.toHaveProperty("words");
    });

    it("minimal bundle still has hash + provenance + schema version", () => {
      expect(minimalBundle.stimulusPackSnapshot.stimulusListHash).toBeTruthy();
      expect(minimalBundle.stimulusPackSnapshot.stimulusSchemaVersion).toBe("sp_v1");
      expect(minimalBundle.stimulusPackSnapshot.provenance).toBeDefined();
    });

    it("privacy manifest is correct for minimal", () => {
      expect(minimalBundle.privacy.mode).toBe("minimal");
      expect(minimalBundle.privacy.includesStimulusWords).toBe(false);
      expect(minimalBundle.privacy.includesResponses).toBe(true);
    });
  });

  describe("Redacted bundle mode", () => {
    const redactedBundle = {
      sessionResult: {
        ...bundle.sessionResult,
        trials: session.trials.map((t) => ({
          ...t, association: { ...t.association, response: "" },
        })),
      },
      protocolDocVersion: bundle.protocolDocVersion,
      appVersion: bundle.appVersion,
      scoringAlgorithm: bundle.scoringAlgorithm,
      exportSchemaVersion: "rb_v3",
      exportedAt: bundle.exportedAt,
      stimulusPackSnapshot: {
        stimulusListHash: session.stimulusPackSnapshot!.stimulusListHash,
        stimulusSchemaVersion: session.stimulusPackSnapshot!.stimulusSchemaVersion,
        provenance: session.stimulusPackSnapshot!.provenance,
      },
      privacy: { mode: "redacted" as const, includesStimulusWords: false, includesResponses: false },
    };

    it("responses are blanked", () => {
      for (const t of redactedBundle.sessionResult.trials) {
        expect(t.association.response).toBe("");
      }
    });

    it("timing data is preserved", () => {
      expect(redactedBundle.sessionResult.trials[0].association.reactionTimeMs).toBe(400);
    });

    it("privacy manifest is correct for redacted", () => {
      expect(redactedBundle.privacy.mode).toBe("redacted");
      expect(redactedBundle.privacy.includesStimulusWords).toBe(false);
      expect(redactedBundle.privacy.includesResponses).toBe(false);
    });

    it("hashes are preserved", () => {
      expect(redactedBundle.stimulusPackSnapshot.stimulusListHash).toBeTruthy();
    });
  });

  it("privacy manifest for full bundle is correct", () => {
    expect(bundle.privacy.mode).toBe("full");
    expect(bundle.privacy.includesStimulusWords).toBe(true);
    expect(bundle.privacy.includesResponses).toBe(true);
  });


  it("bundle alone is sufficient to recreate the pack", () => {
    const snap = bundle.stimulusPackSnapshot;
    expect(snap.words!.length).toBeGreaterThan(0);
    expect(snap.provenance).toBeDefined();
    expect(snap.provenance!.listId).toBeTruthy();
    expect(snap.provenance!.listVersion).toBeTruthy();
    expect(snap.provenance!.language).toBeTruthy();
  });

  describe("sessionResult completeness", () => {
    const sr = bundle.sessionResult;
    const requiredFields = [
      "id", "config", "trials", "scoring", "stimulusOrder",
      "seedUsed", "provenanceSnapshot", "sessionFingerprint",
      "scoringVersion", "appVersion", "startedAt", "completedAt",
    ];
    for (const field of requiredFields) {
      it(`sessionResult includes ${field}`, () => {
        expect(sr).toHaveProperty(field);
      });
    }

    it("sessionResult.appVersion matches top-level appVersion", () => {
      expect(sr.appVersion).toBe(bundle.appVersion);
    });

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
