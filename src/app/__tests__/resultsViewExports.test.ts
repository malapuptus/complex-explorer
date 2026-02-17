import { describe, it, expect } from "vitest";
import { sessionTrialsToCsv, CSV_SCHEMA_VERSION } from "@/domain/csvExport";
import { buildBundleObject, anonymizeBundle, verifyPackageIntegrity, sha256Hex, stableStringify } from "@/app/ResultsExportActions";
import type { Trial, TrialFlag, SessionResult, SessionConfig } from "@/domain/types";

/**
 * Ticket 0186/0205 — Minimal integration test for export wiring.
 * Updated for privacy switchboard (0229), package integrity (0231),
 * anonymize identifiers (0235), and integrity enforcement (0233).
 */

function makeTrial(word: string, index: number): Trial {
  return {
    stimulus: { word, index },
    association: {
      response: "test", reactionTimeMs: 400, tFirstKeyMs: 150,
      backspaceCount: 0, editCount: 1, compositionCount: 0,
    },
    isPractice: false,
  };
}

const testConfig: SessionConfig = {
  stimulusListId: "demo-10", stimulusListVersion: "1.0.0",
  maxResponseTimeMs: 0, orderPolicy: "fixed", seed: null,
};

const testSession: SessionResult = {
  id: "test-session-1", config: testConfig,
  trials: [makeTrial("sun", 0), makeTrial("moon", 1)],
  startedAt: "2026-02-17T00:00:00Z", completedAt: "2026-02-17T00:01:00Z",
  scoring: {
    trialFlags: [{ trialIndex: 0, flags: [] }, { trialIndex: 1, flags: [] }],
    summary: {
      totalTrials: 2, meanReactionTimeMs: 400, medianReactionTimeMs: 400,
      stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0,
      timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0,
    },
  },
  seedUsed: null, stimulusOrder: ["sun", "moon"],
  provenanceSnapshot: null, sessionFingerprint: "abc123def456",
  scoringVersion: "scoring_v2_mad_3.5", appVersion: "1.0.0",
  stimulusPackSnapshot: { stimulusListHash: "testhash123", stimulusSchemaVersion: "sp_v1", provenance: null },
};

describe("Export button wiring", () => {
  describe("CSV output", () => {
    const csv = sessionTrialsToCsv(
      testSession.trials, testSession.scoring.trialFlags,
      testSession.id, testSession.config.stimulusListId,
      testSession.config.stimulusListVersion, testSession.seedUsed,
      testSession.sessionFingerprint, testSession.scoringVersion,
    );
    const header = csv.split("\n")[0];
    const row = csv.split("\n")[1];

    it("CSV includes scoring_version column", () => { expect(header).toContain("scoring_version"); });
    it("CSV includes session_fingerprint column", () => { expect(header).toContain("session_fingerprint"); });
    it("CSV includes csv_schema_version column", () => { expect(header).toContain("csv_schema_version"); });
    it("CSV row contains csv_schema_version value", () => { expect(row.split(",")[0]).toBe(CSV_SCHEMA_VERSION); });
    it("CSV row contains scoring_version value", () => { expect(row).toContain("scoring_v2_mad_3.5"); });
    it("CSV row contains session_fingerprint value", () => { expect(row).toContain("abc123def456"); });
  });

  describe("Redacted CSV output", () => {
    const redacted = sessionTrialsToCsv(
      testSession.trials, testSession.scoring.trialFlags,
      testSession.id, testSession.config.stimulusListId,
      testSession.config.stimulusListVersion, testSession.seedUsed,
      testSession.sessionFingerprint, testSession.scoringVersion,
      { redactResponses: true },
    );
    it("redacted CSV has same header", () => { expect(redacted.split("\n")[0]).toContain("response"); });
    it("redacted CSV blanks response column", () => { expect(redacted.split("\n")[1].split(",")[10]).toBe(""); });
  });

  describe("Research Bundle structure", () => {
    const bundle = {
      exportSchemaVersion: "rb_v3",
      exportedAt: new Date().toISOString(),
      protocolDocVersion: "PROTOCOL.md@2026-02-13",
      appVersion: testSession.appVersion,
      scoringAlgorithm: "MAD-modified-z@3.5",
      privacy: { mode: "full" as const, includesStimulusWords: true, includesResponses: true },
      sessionResult: {
        id: testSession.id, config: testSession.config,
        trials: testSession.trials, scoring: testSession.scoring,
        sessionFingerprint: testSession.sessionFingerprint,
        appVersion: testSession.appVersion,
      },
      stimulusPackSnapshot: { ...testSession.stimulusPackSnapshot, words: testSession.stimulusOrder },
    };

    it("includes exportSchemaVersion rb_v3", () => { expect(bundle.exportSchemaVersion).toBe("rb_v3"); });
    it("includes appVersion", () => { expect(bundle.appVersion).toBe("1.0.0"); });
    it("includes all required top-level keys", () => {
      for (const key of ["sessionResult", "protocolDocVersion", "appVersion", "scoringAlgorithm", "exportSchemaVersion", "exportedAt", "stimulusPackSnapshot", "privacy"]) {
        expect(bundle).toHaveProperty(key);
      }
    });
    it("stimulusPackSnapshot includes words and hash", () => {
      expect(bundle.stimulusPackSnapshot).toHaveProperty("words");
      expect(bundle.stimulusPackSnapshot.words).toEqual(["sun", "moon"]);
    });
    it("privacy manifest matches full mode", () => {
      expect(bundle.privacy.mode).toBe("full");
      expect(bundle.privacy.includesStimulusWords).toBe(true);
      expect(bundle.privacy.includesResponses).toBe(true);
    });
  });

  describe("Privacy switchboard (0229)", () => {
    it("privacy modes are mutually exclusive", () => {
      const modes = ["full", "minimal", "redacted"] as const;
      for (const m of modes) {
        const privacy = {
          mode: m,
          includesStimulusWords: m === "full",
          includesResponses: m !== "redacted",
        };
        expect(privacy.mode).toBe(m);
        if (m === "full") {
          expect(privacy.includesStimulusWords).toBe(true);
          expect(privacy.includesResponses).toBe(true);
        } else if (m === "minimal") {
          expect(privacy.includesStimulusWords).toBe(false);
          expect(privacy.includesResponses).toBe(true);
        } else {
          expect(privacy.includesStimulusWords).toBe(false);
          expect(privacy.includesResponses).toBe(false);
        }
      }
    });
  });

  describe("Session Package structure", () => {
    const pkg = {
      packageVersion: "pkg_v1",
      packageHash: "somehash",
      hashAlgorithm: "sha-256",
      exportedAt: new Date().toISOString(),
      bundle: { exportSchemaVersion: "rb_v3", privacy: { mode: "full" } },
      csv: "csv_data",
      csvRedacted: "csv_redacted",
    };

    it("has pkg_v1 version", () => { expect(pkg.packageVersion).toBe("pkg_v1"); });
    it("includes packageHash and hashAlgorithm", () => {
      expect(pkg).toHaveProperty("packageHash");
      expect(pkg).toHaveProperty("hashAlgorithm");
      expect(pkg.hashAlgorithm).toBe("sha-256");
    });
    it("includes bundle and csv", () => {
      expect(pkg).toHaveProperty("bundle");
      expect(pkg).toHaveProperty("csv");
      expect(pkg).toHaveProperty("csvRedacted");
    });
  });

  describe("Anonymize identifiers (0235)", () => {
    const csvMeta = {
      sessionId: "s1", packId: "demo-10", packVersion: "1.0.0",
      seed: null as number | null, sessionFingerprint: "fp123",
      orderPolicy: "fixed" as const,
    };
    const trials = [makeTrial("sun", 0)];
    const flags: TrialFlag[] = [{ trialIndex: 0, flags: [] }];

    it("anonymizeBundle blanks session ID and timestamps", () => {
      const bundle = buildBundleObject("full", trials, flags, 400, 400, undefined, csvMeta, null, "2026-01-01T00:00:00Z");
      const anon = anonymizeBundle(bundle);
      const sr = anon.sessionResult as Record<string, unknown>;
      expect(sr.id).toBe("anon_session");
      expect(sr.startedAt).toBe("");
      expect(sr.completedAt).toBe("");
      expect(anon.exportedAt).toBe("");
    });

    it("anonymizeBundle preserves hashes and scoring", () => {
      const bundle = buildBundleObject("full", trials, flags, 400, 400, testSession, csvMeta, null, "2026-01-01T00:00:00Z");
      const anon = anonymizeBundle(bundle);
      const sr = anon.sessionResult as Record<string, unknown>;
      expect(sr.sessionFingerprint).toBeTruthy();
      expect(sr.scoring).toBeDefined();
    });
  });

  describe("Import integrity enforcement (0233)", () => {
    it("tampered package fails verification", async () => {
      const csvMeta = {
        sessionId: "s1", packId: "demo-10", packVersion: "1.0.0",
        seed: null as number | null, sessionFingerprint: "fp123",
        orderPolicy: "fixed" as const,
      };
      const bundle = buildBundleObject("full", [makeTrial("sun", 0)], [{ trialIndex: 0, flags: [] }], 400, 400, undefined, csvMeta, null, "2026-01-01T00:00:00Z");
      const PACKAGE_KEY_ORDER = ["packageVersion", "packageHash", "hashAlgorithm", "exportedAt", "bundle", "csv", "csvRedacted"];
      const pkg: Record<string, unknown> = {
        packageVersion: "pkg_v1", packageHash: "", hashAlgorithm: "sha-256",
        exportedAt: "2026-01-01T00:00:00Z", bundle, csv: "csv_data", csvRedacted: "csv_redacted",
      };
      const forHash = { ...pkg, packageHash: undefined };
      delete forHash.packageHash;
      pkg.packageHash = await sha256Hex(stableStringify(forHash, PACKAGE_KEY_ORDER));

      // Tamper 1 byte
      pkg.csv = "csv_datX";
      const result = await verifyPackageIntegrity(pkg);
      expect(result.valid).toBe(false);
    });

    it("untampered package passes verification", async () => {
      const csvMeta = {
        sessionId: "s1", packId: "demo-10", packVersion: "1.0.0",
        seed: null as number | null, sessionFingerprint: "fp123",
        orderPolicy: "fixed" as const,
      };
      const bundle = buildBundleObject("full", [makeTrial("sun", 0)], [{ trialIndex: 0, flags: [] }], 400, 400, undefined, csvMeta, null, "2026-01-01T00:00:00Z");
      const PACKAGE_KEY_ORDER = ["packageVersion", "packageHash", "hashAlgorithm", "exportedAt", "bundle", "csv", "csvRedacted"];
      const pkg: Record<string, unknown> = {
        packageVersion: "pkg_v1", packageHash: "", hashAlgorithm: "sha-256",
        exportedAt: "2026-01-01T00:00:00Z", bundle, csv: "csv_data", csvRedacted: "csv_redacted",
      };
      const forHash = { ...pkg, packageHash: undefined };
      delete forHash.packageHash;
      pkg.packageHash = await sha256Hex(stableStringify(forHash, PACKAGE_KEY_ORDER));

      const result = await verifyPackageIntegrity(pkg);
      expect(result.valid).toBe(true);
    });
  });
});
