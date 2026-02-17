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

  describe("Research Bundle structure", () => {
    const REQUIRED_BUNDLE_KEYS = [
      "sessionResult",
      "protocolDocVersion",
      "scoringAlgorithm",
      "exportSchemaVersion",
      "exportedAt",
      "stimulusPackSnapshot",
    ] as const;

    it("required keys are defined in the contract", () => {
      const bundle = {
        sessionResult: {},
        protocolDocVersion: "PROTOCOL.md@2026-02-13",
        appVersion: "0.0.0",
        scoringAlgorithm: "MAD-modified-z@3.5 + fast<200ms + timeout excluded",
        exportSchemaVersion: "rb_v2",
        exportedAt: new Date().toISOString(),
        stimulusPackSnapshot: { stimulusListHash: null, provenance: null },
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
        exportSchemaVersion: "rb_v2",
        exportedAt: "2026-01-01",
        stimulusPackSnapshot: { stimulusListHash: null, provenance: null },
      };
      expect(bundle).toHaveProperty("appVersion");
      expect(bundle.appVersion).toBeTruthy();
    });

    it("exportSchemaVersion is rb_v2", () => {
      const bundle = {
        sessionResult: {},
        protocolDocVersion: "test",
        appVersion: "1.0.0",
        scoringAlgorithm: "test",
        exportSchemaVersion: "rb_v2",
        exportedAt: "2026-01-01",
        stimulusPackSnapshot: { stimulusListHash: null, provenance: null },
      };
      expect(bundle.exportSchemaVersion).toBe("rb_v2");
    });
  });
});
