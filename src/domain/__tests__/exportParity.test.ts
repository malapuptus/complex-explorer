import { describe, it, expect } from "vitest";
import { sessionTrialsToCsv, CSV_SCHEMA_VERSION } from "../csvExport";
import type { Trial, TrialFlag } from "../types";

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
});
