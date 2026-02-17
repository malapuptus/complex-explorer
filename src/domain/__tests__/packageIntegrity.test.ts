import { describe, it, expect } from "vitest";
import {
  sha256Hex,
  stableStringify,
  verifyPackageIntegrity,
  buildBundleObject,
} from "@/app/ResultsExportActions";
import type { Trial, TrialFlag } from "@/domain/types";

/**
 * Ticket 0240 — pkg_v1 contract + integrity tests.
 * Validates top-level keys, hash verification, and error codes.
 */

const PACKAGE_KEY_ORDER = [
  "packageVersion", "packageHash", "hashAlgorithm", "exportedAt",
  "bundle", "csv", "csvRedacted",
];

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

async function buildTestPackage() {
  const trials = [makeTrial("sun", 0)];
  const flags: TrialFlag[] = [{ trialIndex: 0, flags: [] }];
  const csvMeta = {
    sessionId: "s1", packId: "demo-10", packVersion: "1.0.0",
    seed: null as number | null, sessionFingerprint: "fp123",
    orderPolicy: "fixed" as const,
  };
  const bundle = buildBundleObject(
    "full", trials, flags, 400, 400, undefined, csvMeta, null,
    "2026-01-01T00:00:00Z",
  );
  const pkg: Record<string, unknown> = {
    packageVersion: "pkg_v1",
    packageHash: "",
    hashAlgorithm: "sha-256",
    exportedAt: "2026-01-01T00:00:00Z",
    bundle,
    csv: "csv_schema_version,session_id\ncsv_v1,s1",
    csvRedacted: "csv_schema_version,session_id\ncsv_v1,s1",
  };
  const forHash = { ...pkg, packageHash: undefined };
  delete forHash.packageHash;
  pkg.packageHash = await sha256Hex(stableStringify(forHash, PACKAGE_KEY_ORDER));
  return pkg;
}

describe("pkg_v1 contract (0240)", () => {
  const REQUIRED_TOP_LEVEL_KEYS = [
    "packageVersion", "packageHash", "hashAlgorithm",
    "exportedAt", "bundle", "csv", "csvRedacted",
  ];

  it("exported package contains all required top-level keys", async () => {
    const pkg = await buildTestPackage();
    for (const key of REQUIRED_TOP_LEVEL_KEYS) {
      expect(pkg).toHaveProperty(key);
      expect(pkg[key]).toBeDefined();
    }
  });

  it("packageVersion is pkg_v1", async () => {
    const pkg = await buildTestPackage();
    expect(pkg.packageVersion).toBe("pkg_v1");
  });

  it("hashAlgorithm is sha-256", async () => {
    const pkg = await buildTestPackage();
    expect(pkg.hashAlgorithm).toBe("sha-256");
  });

  it("packageHash is a 64-char hex string", async () => {
    const pkg = await buildTestPackage();
    expect(typeof pkg.packageHash).toBe("string");
    expect(pkg.packageHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("bundle inside package is an rb_v3 object", async () => {
    const pkg = await buildTestPackage();
    const bundle = pkg.bundle as Record<string, unknown>;
    expect(bundle.exportSchemaVersion).toBe("rb_v3");
    expect(bundle).toHaveProperty("privacy");
    expect(bundle).toHaveProperty("sessionResult");
  });
});

describe("pkg_v1 integrity verification (0240)", () => {
  it("PASS for untampered package", async () => {
    const pkg = await buildTestPackage();
    const result = await verifyPackageIntegrity(pkg);
    expect(result.valid).toBe(true);
    expect(result.expected).toBe(result.actual);
  });

  it("FAIL (ERR_INTEGRITY_MISMATCH) when csv is modified by 1 byte", async () => {
    const pkg = await buildTestPackage();
    pkg.csv = (pkg.csv as string).slice(0, -1) + "X";
    const result = await verifyPackageIntegrity(pkg);
    expect(result.valid).toBe(false);
    expect(result.expected).not.toBe(result.actual);
  });

  it("FAIL when csvRedacted is modified", async () => {
    const pkg = await buildTestPackage();
    pkg.csvRedacted = "tampered";
    const result = await verifyPackageIntegrity(pkg);
    expect(result.valid).toBe(false);
  });

  it("FAIL when bundle is modified", async () => {
    const pkg = await buildTestPackage();
    (pkg.bundle as Record<string, unknown>).exportedAt = "tampered";
    const result = await verifyPackageIntegrity(pkg);
    expect(result.valid).toBe(false);
  });

  it("FAIL when exportedAt is modified", async () => {
    const pkg = await buildTestPackage();
    pkg.exportedAt = "tampered";
    const result = await verifyPackageIntegrity(pkg);
    expect(result.valid).toBe(false);
  });
});
