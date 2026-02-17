import { describe, it, expect } from "vitest";
import { sha256Hex, stableStringify, verifyPackageIntegrity, buildBundleObject } from "@/app/ResultsExportActions";
import type { Trial, TrialFlag } from "@/domain/types";

/**
 * Ticket 0231 — Package integrity hash test.
 * Verifies SHA-256 self-check in pkg_v1 envelopes.
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

describe("Package integrity (0231)", () => {
  const trials = [makeTrial("sun", 0)];
  const flags: TrialFlag[] = [{ trialIndex: 0, flags: [] }];
  const csvMeta = {
    sessionId: "s1", packId: "demo-10", packVersion: "1.0.0",
    seed: null as number | null, sessionFingerprint: "fp123",
    orderPolicy: "fixed" as const,
  };

  it("verifyPackageIntegrity succeeds on untampered package", async () => {
    const bundle = buildBundleObject("full", trials, flags, 400, 400, undefined, csvMeta, null, "2026-01-01T00:00:00Z");
    const csv = "csv_data";
    const csvRedacted = "csv_redacted";
    const pkg: Record<string, unknown> = {
      packageVersion: "pkg_v1",
      packageHash: "",
      hashAlgorithm: "sha-256",
      exportedAt: "2026-01-01T00:00:00Z",
      bundle,
      csv,
      csvRedacted,
    };
    const forHash = { ...pkg, packageHash: undefined };
    delete forHash.packageHash;
    const PACKAGE_KEY_ORDER = ["packageVersion", "packageHash", "hashAlgorithm", "exportedAt", "bundle", "csv", "csvRedacted"];
    const canonical = stableStringify(forHash, PACKAGE_KEY_ORDER);
    pkg.packageHash = await sha256Hex(canonical);

    const result = await verifyPackageIntegrity(pkg);
    expect(result.valid).toBe(true);
    expect(result.expected).toBe(result.actual);
  });

  it("verifyPackageIntegrity fails on tampered CSV", async () => {
    const bundle = buildBundleObject("full", trials, flags, 400, 400, undefined, csvMeta, null, "2026-01-01T00:00:00Z");
    const pkg: Record<string, unknown> = {
      packageVersion: "pkg_v1",
      packageHash: "",
      hashAlgorithm: "sha-256",
      exportedAt: "2026-01-01T00:00:00Z",
      bundle,
      csv: "original_csv",
      csvRedacted: "original_redacted",
    };
    const forHash = { ...pkg, packageHash: undefined };
    delete forHash.packageHash;
    const PACKAGE_KEY_ORDER = ["packageVersion", "packageHash", "hashAlgorithm", "exportedAt", "bundle", "csv", "csvRedacted"];
    pkg.packageHash = await sha256Hex(stableStringify(forHash, PACKAGE_KEY_ORDER));

    // Tamper
    pkg.csv = "tampered_csv";

    const result = await verifyPackageIntegrity(pkg);
    expect(result.valid).toBe(false);
    expect(result.expected).not.toBe(result.actual);
  });
});

describe("Deterministic export ordering (0228)", () => {
  const trials = [makeTrial("sun", 0)];
  const flags: TrialFlag[] = [{ trialIndex: 0, flags: [] }];
  const csvMeta = {
    sessionId: "s1", packId: "demo-10", packVersion: "1.0.0",
    seed: 42 as number | null, sessionFingerprint: "fp123",
    orderPolicy: "seeded" as const,
  };
  const timestamp = "2026-01-01T00:00:00Z";

  it("two exports with same timestamp produce identical JSON", () => {
    const b1 = buildBundleObject("full", trials, flags, 400, 400, undefined, csvMeta, null, timestamp);
    const b2 = buildBundleObject("full", trials, flags, 400, 400, undefined, csvMeta, null, timestamp);
    const BUNDLE_KEY_ORDER = ["exportSchemaVersion", "exportedAt", "protocolDocVersion", "appVersion", "scoringAlgorithm", "privacy", "sessionResult", "stimulusPackSnapshot"];
    const json1 = stableStringify(b1, BUNDLE_KEY_ORDER);
    const json2 = stableStringify(b2, BUNDLE_KEY_ORDER);
    expect(json1).toBe(json2);
  });

  it("timestamp is the only nondeterminism", () => {
    const b1 = buildBundleObject("full", trials, flags, 400, 400, undefined, csvMeta, null, "2026-01-01T00:00:00Z");
    const b2 = buildBundleObject("full", trials, flags, 400, 400, undefined, csvMeta, null, "2026-12-31T23:59:59Z");
    const BUNDLE_KEY_ORDER = ["exportSchemaVersion", "exportedAt", "protocolDocVersion", "appVersion", "scoringAlgorithm", "privacy", "sessionResult", "stimulusPackSnapshot"];
    const json1 = stableStringify(b1, BUNDLE_KEY_ORDER);
    const json2 = stableStringify(b2, BUNDLE_KEY_ORDER);
    // Normalize timestamps
    const norm1 = json1.replace(/"exportedAt":\s*"[^"]+"/g, '"exportedAt": "NORMALIZED"');
    const norm2 = json2.replace(/"exportedAt":\s*"[^"]+"/g, '"exportedAt": "NORMALIZED"');
    expect(norm1).toBe(norm2);
  });

  it("stableStringify produces keys in specified order", () => {
    const obj = { z: 1, a: 2, m: 3 };
    const result = stableStringify(obj, ["a", "m", "z"]);
    const keys = Object.keys(JSON.parse(result));
    expect(keys).toEqual(["a", "m", "z"]);
  });
});
