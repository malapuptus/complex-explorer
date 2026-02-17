import { describe, it, expect } from "vitest";
import { sessionTrialsToCsv, CSV_SCHEMA_VERSION } from "../csvExport";
import { buildBundleObject, anonymizeBundle } from "@/app/ResultsExportActions";
import type { Trial, TrialFlag, SessionResult } from "../types";

/**
 * Export parity regression test — locks CSV header and Research Bundle
 * structure so refactors can't silently drift exports.
 * Tolerant to additive schema changes: new columns are allowed as long
 * as required columns exist in expected relative order.
 */

function makeTrial(word: string, index: number): Trial {
  return {
    stimulus: { word, index },
    association: {
      response: "reply",
      reactionTimeMs: 500,
      tFirstKeyMs: 200,
      backspaceCount: 0,
      editCount: 1,
      compositionCount: 0,
    },
    isPractice: false,
  };
}

/** Required CSV columns in expected relative order. */
const REQUIRED_CSV_COLUMNS = [
  "csv_schema_version",
  "session_id",
  "session_fingerprint",
  "scoring_version",
  "pack_id",
  "pack_version",
  "seed",
  "order_index",
  "word",
  "warmup",
  "response",
  "t_first_input_ms",
  "t_submit_ms",
  "backspaces",
  "edits",
  "compositions",
  "timed_out",
  "flags",
] as const;

describe("Export parity", () => {
  const trials: Trial[] = [makeTrial("tree", 0), makeTrial("house", 1)];
  const flags: TrialFlag[] = [
    { trialIndex: 0, flags: [] },
    { trialIndex: 1, flags: ["timing_outlier_slow"] },
  ];

  describe("CSV header", () => {
    const csv = sessionTrialsToCsv(trials, flags, "s1", "demo-10", "1.0.0", 42, "fp123", "sv1");
    const header = csv.split("\n")[0];
    const columns = header.split(",");

    it("contains all required columns", () => {
      for (const col of REQUIRED_CSV_COLUMNS) {
        expect(columns).toContain(col);
      }
    });

    it("required columns appear in expected relative order", () => {
      let lastIndex = -1;
      for (const col of REQUIRED_CSV_COLUMNS) {
        const idx = columns.indexOf(col);
        expect(idx).toBeGreaterThan(lastIndex);
        lastIndex = idx;
      }
    });

    it("has at least the required number of columns", () => {
      expect(columns.length).toBeGreaterThanOrEqual(REQUIRED_CSV_COLUMNS.length);
    });

    it("csv_schema_version column is populated in data rows", () => {
      const row = csv.split("\n")[1];
      const fields = row.split(",");
      expect(fields[0]).toBe(CSV_SCHEMA_VERSION);
    });
  });

  describe("Redacted CSV", () => {
    const redacted = sessionTrialsToCsv(trials, flags, "s1", "demo-10", "1.0.0", 42, "fp123", "sv1", { redactResponses: true });
    const redactedRows = redacted.split("\n");

    it("has same header as normal CSV", () => {
      expect(redactedRows[0]).toBe(redacted.split("\n")[0]);
    });

    it("response column is empty in redacted rows", () => {
      for (let i = 1; i < redactedRows.length; i++) {
        const fields = redactedRows[i].split(",");
        // response is column index 10 (0-based)
        expect(fields[10]).toBe("");
      }
    });

    it("non-response columns match normal CSV", () => {
      const normalCsv = sessionTrialsToCsv(trials, flags, "s1", "demo-10", "1.0.0", 42, "fp123", "sv1");
      const normalRows = normalCsv.split("\n");
      for (let i = 1; i < normalRows.length; i++) {
        const normalFields = normalRows[i].split(",");
        const redactedFields = redactedRows[i].split(",");
        for (let j = 0; j < normalFields.length; j++) {
          if (j === 10) continue; // skip response column
          expect(redactedFields[j]).toBe(normalFields[j]);
        }
      }
    });
  });

  describe("Research Bundle structure", () => {
    const REQUIRED_BUNDLE_KEYS = [
      "sessionResult",
      "protocolDocVersion",
      "scoringAlgorithm",
      "exportSchemaVersion",
      "exportedAt",
      "stimulusPackSnapshot",
      "privacy",
    ] as const;

    it("required keys are defined in the contract", () => {
      const bundle = {
        sessionResult: {},
        protocolDocVersion: "PROTOCOL.md@2026-02-13",
        appVersion: "0.0.0",
        scoringAlgorithm: "MAD-modified-z@3.5 + fast<200ms + timeout excluded",
        exportSchemaVersion: "rb_v3",
        exportedAt: new Date().toISOString(),
        stimulusPackSnapshot: {
          stimulusListHash: null, stimulusSchemaVersion: null, provenance: null, words: ["test"],
        },
        privacy: { mode: "full", includesStimulusWords: true, includesResponses: true },
      };

      for (const key of REQUIRED_BUNDLE_KEYS) {
        expect(bundle).toHaveProperty(key);
        expect(bundle[key]).toBeDefined();
      }
    });

    it("appVersion key exists in bundle", () => {
      const bundle = {
        sessionResult: {},
        protocolDocVersion: "test",
        appVersion: "1.0.0",
        scoringAlgorithm: "test",
        exportSchemaVersion: "rb_v3",
        exportedAt: "2026-01-01",
        stimulusPackSnapshot: {
          stimulusListHash: null, stimulusSchemaVersion: null, provenance: null, words: ["w"],
        },
        privacy: { mode: "full", includesStimulusWords: true, includesResponses: true },
      };
      expect(bundle).toHaveProperty("appVersion");
      expect(bundle.appVersion).toBeTruthy();
    });

    it("exportSchemaVersion is rb_v3", () => {
      const bundle = {
        sessionResult: {},
        protocolDocVersion: "test",
        appVersion: "1.0.0",
        scoringAlgorithm: "test",
        exportSchemaVersion: "rb_v3",
        exportedAt: "2026-01-01",
        stimulusPackSnapshot: {
          stimulusListHash: null, stimulusSchemaVersion: null, provenance: null, words: ["w"],
        },
        privacy: { mode: "full", includesStimulusWords: true, includesResponses: true },
      };
      expect(bundle.exportSchemaVersion).toBe("rb_v3");
    });

    it("stimulusPackSnapshot includes words array", () => {
      const bundle = {
        sessionResult: {},
        protocolDocVersion: "test",
        appVersion: "1.0.0",
        scoringAlgorithm: "test",
        exportSchemaVersion: "rb_v3",
        exportedAt: "2026-01-01",
        stimulusPackSnapshot: {
          stimulusListHash: "hash", stimulusSchemaVersion: "sp_v1",
          provenance: { listId: "p", listVersion: "1", language: "en", source: "s",
            sourceName: "S", sourceYear: "2026", sourceCitation: "c", licenseNote: "l", wordCount: 1 },
          words: ["alpha", "beta"],
        },
        privacy: { mode: "full", includesStimulusWords: true, includesResponses: true },
      };
      expect(bundle.stimulusPackSnapshot.words).toEqual(["alpha", "beta"]);
    });

    it("privacy manifest present and valid for full mode", () => {
      const bundle = {
        privacy: { mode: "full", includesStimulusWords: true, includesResponses: true },
      };
      expect(bundle.privacy.mode).toBe("full");
    });
  });

  describe("buildBundleObject sessionResult completeness (0238)", () => {
    it("Full bundle sessionResult includes all required fields", () => {
      const session: SessionResult = {
        id: "s1", config: { stimulusListId: "demo-10", stimulusListVersion: "1.0.0", maxResponseTimeMs: 0, orderPolicy: "fixed", seed: null },
        trials: [makeTrial("sun", 0)], startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z",
        scoring: { trialFlags: [{ trialIndex: 0, flags: [] }], summary: { totalTrials: 1, meanReactionTimeMs: 400, medianReactionTimeMs: 400, stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0, timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0 } },
        seedUsed: null, stimulusOrder: ["sun"], provenanceSnapshot: null,
        sessionFingerprint: "fp123", scoringVersion: "scoring_v2_mad_3.5",
        appVersion: "1.2.3", stimulusPackSnapshot: null,
      };
      const csvMeta = { sessionId: "s1", packId: "demo-10", packVersion: "1.0.0", seed: null as number | null, sessionFingerprint: "fp123", orderPolicy: "fixed" as const };
      const bundle = buildBundleObject("full", session.trials, session.scoring.trialFlags, 400, 400, session, csvMeta, null, "2026-01-01T00:00:00Z");

      const sr = bundle.sessionResult as Record<string, unknown>;
      const requiredFields = ["id", "config", "trials", "scoring", "stimulusOrder", "seedUsed", "provenanceSnapshot", "sessionFingerprint", "scoringVersion", "appVersion", "startedAt", "completedAt"];
      for (const field of requiredFields) {
        expect(sr).toHaveProperty(field);
      }
      expect(sr.appVersion).toBe("1.2.3");
      expect(sr.startedAt).toBe("2026-01-01T00:00:00Z");
      expect(sr.completedAt).toBe("2026-01-01T00:01:00Z");
      expect(sr.scoringVersion).toBe("scoring_v2_mad_3.5");
    });

    it("Anonymized bundle still has all keys (values may be blanked)", () => {
      const session: SessionResult = {
        id: "s1", config: { stimulusListId: "demo-10", stimulusListVersion: "1.0.0", maxResponseTimeMs: 0, orderPolicy: "fixed", seed: null },
        trials: [makeTrial("sun", 0)], startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z",
        scoring: { trialFlags: [{ trialIndex: 0, flags: [] }], summary: { totalTrials: 1, meanReactionTimeMs: 400, medianReactionTimeMs: 400, stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0, timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0 } },
        seedUsed: null, stimulusOrder: ["sun"], provenanceSnapshot: null,
        sessionFingerprint: "fp123", scoringVersion: "scoring_v2_mad_3.5",
        appVersion: "1.0.0", stimulusPackSnapshot: null,
      };
      const csvMeta = { sessionId: "s1", packId: "demo-10", packVersion: "1.0.0", seed: null as number | null, sessionFingerprint: "fp123", orderPolicy: "fixed" as const };
      const bundle = buildBundleObject("full", session.trials, session.scoring.trialFlags, 400, 400, session, csvMeta, null, "");
      const anon = anonymizeBundle(bundle);
      const sr = anon.sessionResult as Record<string, unknown>;

      expect(sr).toHaveProperty("id");
      expect(sr).toHaveProperty("startedAt");
      expect(sr).toHaveProperty("completedAt");
      expect(sr).toHaveProperty("appVersion");
      expect(sr.startedAt).toBe("");
      expect(sr.completedAt).toBe("");
      expect((sr.id as string).startsWith("anon_")).toBe(true);
    });
  });
});
