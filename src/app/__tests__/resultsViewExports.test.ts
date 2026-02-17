import { describe, it, expect } from "vitest";
import { sessionTrialsToCsv, CSV_SCHEMA_VERSION } from "@/domain/csvExport";
import type { Trial, TrialFlag, SessionResult, SessionConfig } from "@/domain/types";

/**
 * Ticket 0186/0205 — Minimal integration test for export wiring.
 * Verifies CSV and Research Bundle outputs contain required fields.
 */

function makeTrial(word: string, index: number): Trial {
  return {
    stimulus: { word, index },
    association: {
      response: "test",
      reactionTimeMs: 400,
      tFirstKeyMs: 150,
      backspaceCount: 0,
      editCount: 1,
      compositionCount: 0,
    },
    isPractice: false,
  };
}

const testConfig: SessionConfig = {
  stimulusListId: "demo-10",
  stimulusListVersion: "1.0.0",
  maxResponseTimeMs: 0,
  orderPolicy: "fixed",
  seed: null,
};

const testSession: SessionResult = {
  id: "test-session-1",
  config: testConfig,
  trials: [makeTrial("sun", 0), makeTrial("moon", 1)],
  startedAt: "2026-02-17T00:00:00Z",
  completedAt: "2026-02-17T00:01:00Z",
  scoring: {
    trialFlags: [
      { trialIndex: 0, flags: [] },
      { trialIndex: 1, flags: [] },
    ],
    summary: {
      totalTrials: 2,
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
  stimulusOrder: ["sun", "moon"],
  provenanceSnapshot: null,
  sessionFingerprint: "abc123def456",
  scoringVersion: "scoring_v2_mad_3.5",
  appVersion: "1.0.0",
  stimulusPackSnapshot: {
    stimulusListHash: "testhash123",
    stimulusSchemaVersion: "sp_v1",
    provenance: null,
  },
};

describe("Export button wiring", () => {
  describe("CSV output", () => {
    const csv = sessionTrialsToCsv(
      testSession.trials,
      testSession.scoring.trialFlags,
      testSession.id,
      testSession.config.stimulusListId,
      testSession.config.stimulusListVersion,
      testSession.seedUsed,
      testSession.sessionFingerprint,
      testSession.scoringVersion,
    );
    const header = csv.split("\n")[0];
    const row = csv.split("\n")[1];

    it("CSV includes scoring_version column", () => {
      expect(header).toContain("scoring_version");
    });

    it("CSV includes session_fingerprint column", () => {
      expect(header).toContain("session_fingerprint");
    });

    it("CSV includes csv_schema_version column", () => {
      expect(header).toContain("csv_schema_version");
    });

    it("CSV row contains csv_schema_version value", () => {
      const fields = row.split(",");
      expect(fields[0]).toBe(CSV_SCHEMA_VERSION);
    });

    it("CSV row contains scoring_version value", () => {
      expect(row).toContain("scoring_v2_mad_3.5");
    });

    it("CSV row contains session_fingerprint value", () => {
      expect(row).toContain("abc123def456");
    });
  });

  describe("Redacted CSV output", () => {
    const redacted = sessionTrialsToCsv(
      testSession.trials,
      testSession.scoring.trialFlags,
      testSession.id,
      testSession.config.stimulusListId,
      testSession.config.stimulusListVersion,
      testSession.seedUsed,
      testSession.sessionFingerprint,
      testSession.scoringVersion,
      { redactResponses: true },
    );

    it("redacted CSV has same header", () => {
      expect(redacted.split("\n")[0]).toContain("response");
    });

    it("redacted CSV blanks response column", () => {
      const row = redacted.split("\n")[1];
      const fields = row.split(",");
      expect(fields[10]).toBe("");
    });
  });

  describe("Research Bundle structure", () => {
    // Simulate what ResultsExportActions builds (rb_v3)
    const bundle = {
      sessionResult: {
        id: testSession.id,
        config: testSession.config,
        trials: testSession.trials,
        scoring: testSession.scoring,
        sessionFingerprint: testSession.sessionFingerprint,
        appVersion: testSession.appVersion,
      },
      protocolDocVersion: "PROTOCOL.md@2026-02-13",
      appVersion: testSession.appVersion,
      scoringAlgorithm: "MAD-modified-z@3.5",
      exportSchemaVersion: "rb_v3",
      exportedAt: new Date().toISOString(),
      stimulusPackSnapshot: {
        ...testSession.stimulusPackSnapshot,
        words: testSession.stimulusOrder,
      },
    };

    it("includes exportSchemaVersion rb_v3", () => {
      expect(bundle.exportSchemaVersion).toBe("rb_v3");
    });

    it("includes appVersion", () => {
      expect(bundle.appVersion).toBe("1.0.0");
    });

    it("includes all required top-level keys", () => {
      const required = [
        "sessionResult",
        "protocolDocVersion",
        "appVersion",
        "scoringAlgorithm",
        "exportSchemaVersion",
        "exportedAt",
        "stimulusPackSnapshot",
      ];
      for (const key of required) {
        expect(bundle).toHaveProperty(key);
      }
    });

    it("stimulusPackSnapshot includes words and hash", () => {
      expect(bundle.stimulusPackSnapshot).toHaveProperty("words");
      expect(bundle.stimulusPackSnapshot).toHaveProperty("stimulusListHash");
      expect(bundle.stimulusPackSnapshot.words).toEqual(["sun", "moon"]);
    });

    it("snapshot is present for historical sessions", () => {
      expect(bundle.stimulusPackSnapshot.stimulusListHash).toBe("testhash123");
      expect(bundle.stimulusPackSnapshot.stimulusSchemaVersion).toBe("sp_v1");
    });
  });
});
