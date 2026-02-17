/**
 * Ticket 0226 — Schema compatibility harness.
 * Guarantees bundle/pack import remains backward compatible.
 */

import { describe, it, expect } from "vitest";
import { validateStimulusList } from "@/domain";

/** Inline fixtures for known schema versions. */

const SP_V1_FIXTURE = {
  id: "compat-test",
  version: "1.0.0",
  language: "en",
  source: "test",
  provenance: {
    sourceName: "Compat Test",
    sourceYear: "2026",
    sourceCitation: "Test citation",
    licenseNote: "Test license",
  },
  words: ["alpha", "beta", "gamma"],
  stimulusSchemaVersion: "sp_v1",
  stimulusListHash: "somehash",
};

const RB_V2_FIXTURE = {
  exportSchemaVersion: "rb_v2",
  exportedAt: "2026-01-01T00:00:00Z",
  protocolDocVersion: "PROTOCOL.md@2026-02-13",
  appVersion: "1.0.0",
  scoringAlgorithm: "MAD-modified-z@3.5 + fast<200ms + timeout excluded",
  sessionResult: {
    id: "s1", config: { stimulusListId: "demo-10", stimulusListVersion: "1.0.0", orderPolicy: "fixed", seed: null },
    trials: [], scoring: { trialFlags: [], summary: {} },
  },
  stimulusPackSnapshot: {
    stimulusListHash: "hash123",
    stimulusSchemaVersion: "sp_v1",
    provenance: null,
  },
};

const RB_V3_FULL_FIXTURE = {
  ...RB_V2_FIXTURE,
  exportSchemaVersion: "rb_v3",
  stimulusPackSnapshot: {
    ...RB_V2_FIXTURE.stimulusPackSnapshot,
    words: ["alpha", "beta"],
  },
  privacy: { mode: "full", includesStimulusWords: true, includesResponses: true },
};

const RB_V3_MINIMAL_FIXTURE = {
  ...RB_V2_FIXTURE,
  exportSchemaVersion: "rb_v3",
  stimulusPackSnapshot: {
    stimulusListHash: "hash123",
    stimulusSchemaVersion: "sp_v1",
    provenance: null,
    // No words
  },
  privacy: { mode: "minimal", includesStimulusWords: false, includesResponses: true },
};

const RB_V3_REDACTED_FIXTURE = {
  ...RB_V2_FIXTURE,
  exportSchemaVersion: "rb_v3",
  stimulusPackSnapshot: {
    stimulusListHash: "hash123",
    stimulusSchemaVersion: "sp_v1",
    provenance: null,
  },
  privacy: { mode: "redacted", includesStimulusWords: false, includesResponses: false },
};

describe("Schema compatibility harness", () => {
  describe("sp_v1 pack validation", () => {
    it("accepts valid sp_v1 pack", () => {
      const errors = validateStimulusList(SP_V1_FIXTURE);
      expect(errors).toHaveLength(0);
    });

    it("rejects pack with missing required fields", () => {
      const broken = { ...SP_V1_FIXTURE, id: undefined };
      const errors = validateStimulusList(broken as any);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].code).toBe("MISSING_ID");
    });
  });

  describe("rb_v2 bundle structure", () => {
    it("has required top-level keys", () => {
      const required = ["exportSchemaVersion", "sessionResult", "protocolDocVersion", "scoringAlgorithm", "exportedAt"];
      for (const key of required) {
        expect(RB_V2_FIXTURE).toHaveProperty(key);
      }
    });

    it("has stimulusPackSnapshot with hash", () => {
      expect(RB_V2_FIXTURE.stimulusPackSnapshot).toHaveProperty("stimulusListHash");
    });

    it("does not have words in snapshot (v2 predates words embedding)", () => {
      expect(RB_V2_FIXTURE.stimulusPackSnapshot).not.toHaveProperty("words");
    });
  });

  describe("rb_v3 full bundle", () => {
    it("has words in snapshot", () => {
      expect(RB_V3_FULL_FIXTURE.stimulusPackSnapshot).toHaveProperty("words");
      expect(Array.isArray(RB_V3_FULL_FIXTURE.stimulusPackSnapshot.words)).toBe(true);
    });

    it("has privacy manifest with full mode", () => {
      expect(RB_V3_FULL_FIXTURE.privacy.mode).toBe("full");
      expect(RB_V3_FULL_FIXTURE.privacy.includesStimulusWords).toBe(true);
      expect(RB_V3_FULL_FIXTURE.privacy.includesResponses).toBe(true);
    });
  });

  describe("rb_v3 minimal bundle", () => {
    it("does not have words", () => {
      expect(RB_V3_MINIMAL_FIXTURE.stimulusPackSnapshot).not.toHaveProperty("words");
    });

    it("has privacy manifest with minimal mode", () => {
      expect(RB_V3_MINIMAL_FIXTURE.privacy.mode).toBe("minimal");
      expect(RB_V3_MINIMAL_FIXTURE.privacy.includesStimulusWords).toBe(false);
      expect(RB_V3_MINIMAL_FIXTURE.privacy.includesResponses).toBe(true);
    });
  });

  describe("rb_v3 redacted bundle", () => {
    it("has privacy manifest with redacted mode", () => {
      expect(RB_V3_REDACTED_FIXTURE.privacy.mode).toBe("redacted");
      expect(RB_V3_REDACTED_FIXTURE.privacy.includesStimulusWords).toBe(false);
      expect(RB_V3_REDACTED_FIXTURE.privacy.includesResponses).toBe(false);
    });
  });

  describe("bundle import compatibility (auto-detect)", () => {
    it("rb_v3 full bundle has extractable pack payload", () => {
      const snap = RB_V3_FULL_FIXTURE.stimulusPackSnapshot;
      expect(snap.words).toBeDefined();
      expect(snap.words!.length).toBeGreaterThan(0);
    });

    it("rb_v2 bundle has no words to extract", () => {
      expect(RB_V2_FIXTURE.stimulusPackSnapshot).not.toHaveProperty("words");
    });

    it("rb_v3 minimal bundle has no words to extract", () => {
      expect(RB_V3_MINIMAL_FIXTURE.stimulusPackSnapshot).not.toHaveProperty("words");
    });
  });

  describe("JSON round-trip stability", () => {
    for (const [name, fixture] of [
      ["rb_v2", RB_V2_FIXTURE],
      ["rb_v3 full", RB_V3_FULL_FIXTURE],
      ["rb_v3 minimal", RB_V3_MINIMAL_FIXTURE],
      ["rb_v3 redacted", RB_V3_REDACTED_FIXTURE],
    ] as const) {
      it(`${name} survives JSON round-trip`, () => {
        const json = JSON.stringify(fixture);
        const parsed = JSON.parse(json);
        expect(parsed.exportSchemaVersion).toBe(fixture.exportSchemaVersion);
        expect(parsed.stimulusPackSnapshot.stimulusListHash).toBe(fixture.stimulusPackSnapshot.stimulusListHash);
      });
    }
  });
});
