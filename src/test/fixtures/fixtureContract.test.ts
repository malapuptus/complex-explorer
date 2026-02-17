/**
 * Ticket 0263 — Fixture contract tests.
 * Validates pkg_v1 fixtures have the expected shape for use in tests and the report generator.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadFixture(name: string): Record<string, unknown> {
  const p = resolve(__dirname, "../fixtures", name);
  return JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
}

describe("pkg_v1_full_small fixture", () => {
  const pkg = loadFixture("pkg_v1_full_small.json");

  it("has required top-level keys", () => {
    for (const k of ["packageVersion", "packageHash", "hashAlgorithm", "exportedAt", "bundle", "csv", "csvRedacted"]) {
      expect(pkg).toHaveProperty(k);
    }
  });

  it("packageVersion is pkg_v1", () => {
    expect(pkg.packageVersion).toBe("pkg_v1");
  });

  it("bundle.exportSchemaVersion is rb_v3", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    expect(bundle.exportSchemaVersion).toBe("rb_v3");
  });

  it("privacy.mode is full", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    const privacy = bundle.privacy as Record<string, unknown>;
    expect(privacy.mode).toBe("full");
    expect(privacy.includesStimulusWords).toBe(true);
    expect(privacy.includesResponses).toBe(true);
  });

  it("privacy.identifiersAnonymized is present", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    const privacy = bundle.privacy as Record<string, unknown>;
    expect(privacy).toHaveProperty("identifiersAnonymized");
  });

  it("sessionResult has sessionContext with inputHints", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    const sr = bundle.sessionResult as Record<string, unknown>;
    const ctx = sr.sessionContext as Record<string, unknown>;
    expect(ctx).toBeDefined();
    expect(ctx).toHaveProperty("deviceClass");
    expect(ctx).toHaveProperty("inputHints");
    const hints = ctx.inputHints as Record<string, unknown>;
    expect(hints).toHaveProperty("usedIME");
    expect(hints).toHaveProperty("totalCompositionCount");
  });

  it("stimulusPackSnapshot has words", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    const snap = bundle.stimulusPackSnapshot as Record<string, unknown>;
    expect(Array.isArray(snap.words)).toBe(true);
    expect((snap.words as string[]).length).toBeGreaterThan(0);
  });

  it("sessionResult has 3 scored trials", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    const sr = bundle.sessionResult as Record<string, unknown>;
    const trials = sr.trials as unknown[];
    expect(trials.length).toBe(3);
  });
});

describe("pkg_v1_redacted_small fixture", () => {
  const pkg = loadFixture("pkg_v1_redacted_small.json");

  it("has required top-level keys", () => {
    for (const k of ["packageVersion", "packageHash", "hashAlgorithm", "exportedAt", "bundle", "csv", "csvRedacted"]) {
      expect(pkg).toHaveProperty(k);
    }
  });

  it("privacy.mode is redacted", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    const privacy = bundle.privacy as Record<string, unknown>;
    expect(privacy.mode).toBe("redacted");
    expect(privacy.includesStimulusWords).toBe(false);
    expect(privacy.includesResponses).toBe(false);
  });

  it("all trial responses are empty", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    const sr = bundle.sessionResult as Record<string, unknown>;
    const trials = sr.trials as Array<Record<string, unknown>>;
    for (const t of trials) {
      const assoc = t.association as Record<string, unknown>;
      expect(assoc.response).toBe("");
    }
  });

  it("timing data is preserved in redacted fixture", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    const sr = bundle.sessionResult as Record<string, unknown>;
    const trials = sr.trials as Array<Record<string, unknown>>;
    const assoc = trials[0].association as Record<string, unknown>;
    expect(typeof assoc.reactionTimeMs).toBe("number");
    expect((assoc.reactionTimeMs as number)).toBeGreaterThan(0);
  });

  it("stimulusPackSnapshot has no words in redacted", () => {
    const bundle = pkg.bundle as Record<string, unknown>;
    const snap = bundle.stimulusPackSnapshot as Record<string, unknown>;
    expect(snap).not.toHaveProperty("words");
  });
});

describe("tampered fixture detection (simulated)", () => {
  it("integrity check fails on modified packageHash placeholder", () => {
    const pkg = loadFixture("pkg_v1_full_small.json");
    // The fixture uses __PLACEHOLDER__ — it would fail real integrity check
    expect(pkg.packageHash).toBe("__PLACEHOLDER__");
    // In production, research-report.mjs would exit non-zero on this
  });
});
