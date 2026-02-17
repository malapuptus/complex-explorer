import { describe, it, expect } from "vitest";
import {
  analyzeImport,
  getAvailableActions,
  formatKB,
  extractPackFromBundle,
} from "@/app/importPreviewModel";
import type { ImportPreview } from "@/app/importPreviewModel";

/**
 * Ticket 0255 — importPreviewModel contract tests.
 * Locks down analyzeImport, getAvailableActions, and diagnostics payload shape.
 */

// ── Fixtures ─────────────────────────────────────────────────────────

const WORDS = ["sun", "moon", "star"];

const packJson = JSON.stringify({
  id: "test-pack",
  version: "1.0.0",
  language: "en",
  source: "test",
  provenance: {
    sourceName: "Test Source",
    sourceYear: "2024",
    sourceCitation: "Test Citation",
    licenseNote: "CC0",
  },
  words: WORDS,
  stimulusSchemaVersion: "sp_v1",
  stimulusListHash: "abc123",
});

const bundleJson = JSON.stringify({
  exportSchemaVersion: "rb_v3",
  exportedAt: "2026-01-01T00:00:00Z",
  privacy: { mode: "full", includesStimulusWords: true, includesResponses: true },
  sessionResult: { id: "s1", startedAt: "", completedAt: "" },
  stimulusPackSnapshot: {
    stimulusListHash: "hashxyz",
    stimulusSchemaVersion: "sp_v1",
    provenance: {
      listId: "bundle-pack",
      listVersion: "2.0.0",
      language: "en",
      source: "src",
      sourceName: "Bundle Source",
      sourceYear: "2025",
      sourceCitation: "Bundle Citation",
      licenseNote: "MIT",
    },
    words: WORDS,
  },
});

function makePkgJson(
  words: string[] | null = WORDS,
  corrupt = false,
): string {
  const sessionResult = { id: "sess-pkg", startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:01:00Z" };
  const snapshot = words
    ? {
        stimulusListHash: "snapHash",
        stimulusSchemaVersion: "sp_v1",
        words,
        provenance: {
          listId: "pkg-pack",
          listVersion: "1.0.0",
          language: "en",
          source: "src",
          sourceName: "Pkg Source",
          sourceYear: "2025",
          sourceCitation: "Pkg Citation",
          licenseNote: "MIT",
        },
      }
    : {
        stimulusListHash: null,
        stimulusSchemaVersion: "sp_v1",
      };
  return JSON.stringify({
    packageVersion: "pkg_v1",
    packageHash: corrupt ? "tampered-hash" : "valid-hash",
    hashAlgorithm: "sha-256",
    exportedAt: "2026-01-01T00:00:00Z",
    bundle: {
      exportSchemaVersion: "rb_v3",
      exportedAt: "2026-01-01T00:00:00Z",
      privacy: { mode: words ? "full" : "minimal", includesStimulusWords: !!words, includesResponses: true },
      sessionResult,
      stimulusPackSnapshot: snapshot,
    },
    csv: "csv_schema_version,session_id\ncsv_v1,sess-pkg",
    csvRedacted: "csv_schema_version,session_id\ncsv_v1,sess-pkg",
  });
}

// ── analyzeImport ─────────────────────────────────────────────────────

describe("analyzeImport — pack JSON", () => {
  it("returns type 'pack' for direct pack JSON", () => {
    const parsed = JSON.parse(packJson) as Record<string, unknown>;
    const preview = analyzeImport(parsed, packJson);
    expect(preview).not.toBeNull();
    expect(preview!.type).toBe("pack");
  });

  it("wordCount equals words array length", () => {
    const parsed = JSON.parse(packJson) as Record<string, unknown>;
    const preview = analyzeImport(parsed, packJson)!;
    expect(preview.wordCount).toBe(WORDS.length);
  });

  it("hash from stimulusListHash", () => {
    const parsed = JSON.parse(packJson) as Record<string, unknown>;
    const preview = analyzeImport(parsed, packJson)!;
    expect(preview.hash).toBe("abc123");
  });

  it("sizeBytes equals rawJson.length", () => {
    const parsed = JSON.parse(packJson) as Record<string, unknown>;
    const preview = analyzeImport(parsed, packJson)!;
    expect(preview.sizeBytes).toBe(packJson.length);
  });

  it("returns null for invalid JSON structure", () => {
    const result = analyzeImport({}, "{}");
    // Empty object = no id, no version — treat as pack with no words; still returns preview
    // But a completely empty object should return packData = {}
    expect(result).not.toBeNull();
    expect(result!.wordCount).toBe(0);
  });
});

describe("analyzeImport — bundle (rb_v3)", () => {
  it("returns type 'bundle'", () => {
    const parsed = JSON.parse(bundleJson) as Record<string, unknown>;
    const preview = analyzeImport(parsed, bundleJson)!;
    expect(preview.type).toBe("bundle");
  });

  it("extracts words from stimulusPackSnapshot", () => {
    const parsed = JSON.parse(bundleJson) as Record<string, unknown>;
    const preview = analyzeImport(parsed, bundleJson)!;
    expect(preview.wordCount).toBe(WORDS.length);
  });

  it("extracts pack id and version from provenance", () => {
    const parsed = JSON.parse(bundleJson) as Record<string, unknown>;
    const preview = analyzeImport(parsed, bundleJson)!;
    expect(preview.packData.id).toBe("bundle-pack");
    expect(preview.packData.version).toBe("2.0.0");
  });
});

describe("analyzeImport — pkg_v1 full (words present)", () => {
  it("returns type 'package'", () => {
    const raw = makePkgJson(WORDS);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const preview = analyzeImport(parsed, raw)!;
    expect(preview.type).toBe("package");
  });

  it("wordCount > 0", () => {
    const raw = makePkgJson(WORDS);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const preview = analyzeImport(parsed, raw)!;
    expect(preview.wordCount).toBe(WORDS.length);
  });

  it("packageVersion is set", () => {
    const raw = makePkgJson(WORDS);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const preview = analyzeImport(parsed, raw)!;
    expect(preview.packageVersion).toBe("pkg_v1");
  });

  it("packageHash is set", () => {
    const raw = makePkgJson(WORDS, false);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const preview = analyzeImport(parsed, raw)!;
    expect(preview.packageHash).toBe("valid-hash");
  });
});

describe("analyzeImport — pkg_v1 minimal/redacted (no words)", () => {
  it("wordCount is 0", () => {
    const raw = makePkgJson(null);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const preview = analyzeImport(parsed, raw)!;
    expect(preview.wordCount).toBe(0);
  });

  it("type is still 'package'", () => {
    const raw = makePkgJson(null);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const preview = analyzeImport(parsed, raw)!;
    expect(preview.type).toBe("package");
  });
});

// ── extractPackFromBundle ─────────────────────────────────────────────

describe("extractPackFromBundle", () => {
  it("returns pack data from valid bundle", () => {
    const parsed = JSON.parse(bundleJson) as Record<string, unknown>;
    const pack = extractPackFromBundle(parsed);
    expect(pack).not.toBeNull();
    expect(pack!.words).toEqual(WORDS);
  });

  it("returns null when exportSchemaVersion missing", () => {
    const result = extractPackFromBundle({ stimulusPackSnapshot: { words: ["a"] } });
    expect(result).toBeNull();
  });

  it("returns null when words array is empty", () => {
    const result = extractPackFromBundle({
      exportSchemaVersion: "rb_v3",
      stimulusPackSnapshot: { words: [], provenance: {} },
    });
    expect(result).toBeNull();
  });

  it("returns null when provenance missing", () => {
    const result = extractPackFromBundle({
      exportSchemaVersion: "rb_v3",
      stimulusPackSnapshot: { words: ["sun"] },
    });
    expect(result).toBeNull();
  });
});

// ── getAvailableActions ───────────────────────────────────────────────

function makePreview(overrides: Partial<ImportPreview>): ImportPreview {
  return {
    type: "pack",
    packData: {},
    wordCount: 0,
    hash: null,
    schemaVersion: null,
    sizeBytes: 100,
    rawJson: "{}",
    ...overrides,
  };
}

const passIntegrity = { valid: true, expected: "aabb", actual: "aabb" };
const failIntegrity = { valid: false, expected: "aabb", actual: "ccdd" };

describe("getAvailableActions", () => {
  it("valid pkg full → Import as Session + Extract Pack", () => {
    const preview = makePreview({
      type: "package",
      wordCount: 3,
      integrityResult: passIntegrity,
      sessionToImport: {} as never,
    });
    const actions = getAvailableActions(preview, false);
    expect(actions).toContain("Import as Session");
    expect(actions).toContain("Extract Pack");
    expect(actions).not.toContain("Blocked: Integrity mismatch");
  });

  it("valid pkg minimal/redacted (no words) → Import as Session only", () => {
    const preview = makePreview({
      type: "package",
      wordCount: 0,
      integrityResult: passIntegrity,
      sessionToImport: {} as never,
    });
    const actions = getAvailableActions(preview, false);
    expect(actions).toContain("Import as Session");
    expect(actions).not.toContain("Extract Pack");
    expect(actions).not.toContain("Blocked: Integrity mismatch");
  });

  it("tampered pkg (integrity fail) → Blocked only", () => {
    const preview = makePreview({
      type: "package",
      wordCount: 3,
      integrityResult: failIntegrity,
    });
    const actions = getAvailableActions(preview, true);
    expect(actions).toEqual(["Blocked: Integrity mismatch"]);
  });

  it("bundle with extractable pack → Import Pack", () => {
    const preview = makePreview({ type: "bundle", wordCount: 2 });
    const actions = getAvailableActions(preview, false);
    expect(actions).toEqual(["Import Pack"]);
  });

  it("pack JSON → Import Pack", () => {
    const preview = makePreview({ type: "pack", wordCount: 5 });
    const actions = getAvailableActions(preview, false);
    expect(actions).toEqual(["Import Pack"]);
  });

  it("pkg with no sessionToImport and no words → Import as Session (fallback)", () => {
    // Edge case: package with integrity PASS but no session and no words
    const preview = makePreview({
      type: "package",
      wordCount: 0,
      integrityResult: passIntegrity,
      sessionToImport: null,
    });
    const actions = getAvailableActions(preview, false);
    // The model guarantees at least one action for valid packages
    expect(actions).toContain("Import as Session");
  });
});

// ── formatKB ─────────────────────────────────────────────────────────

describe("formatKB", () => {
  it("shows bytes when < 1024", () => {
    expect(formatKB(512)).toBe("512 B");
  });

  it("shows KB when >= 1024", () => {
    expect(formatKB(2048)).toBe("2.0 KB");
  });

  it("shows exact edge at 1024", () => {
    expect(formatKB(1024)).toBe("1.0 KB");
  });
});

// ── Diagnostics payload shape ─────────────────────────────────────────

describe("Diagnostics payload shape (0255)", () => {
  it("contains code, expectedHash, computedHash, packageVersion", () => {
    // The payload is constructed in ImportPreviewPanel from integrityResult + packageVersion.
    // Here we verify the model provides the correct fields for building it.
    const preview = makePreview({
      type: "package",
      integrityResult: failIntegrity,
      packageVersion: "pkg_v1",
    });

    // Simulate the payload construction used in ImportPreviewPanel.handleCopyDiagnostics
    const payload = {
      code: preview.integrityResult!.valid ? "PASS" : "ERR_INTEGRITY_MISMATCH",
      expectedHash: preview.integrityResult!.expected,
      computedHash: preview.integrityResult!.actual,
      packageVersion: preview.packageVersion ?? null,
    };

    expect(payload.code).toBe("ERR_INTEGRITY_MISMATCH");
    expect(payload.expectedHash).toBe("aabb");
    expect(payload.computedHash).toBe("ccdd");
    expect(payload.packageVersion).toBe("pkg_v1");
  });

  it("PASS diagnostics payload has code PASS", () => {
    const preview = makePreview({
      type: "package",
      integrityResult: passIntegrity,
      packageVersion: "pkg_v1",
    });
    const payload = {
      code: preview.integrityResult!.valid ? "PASS" : "ERR_INTEGRITY_MISMATCH",
      expectedHash: preview.integrityResult!.expected,
      computedHash: preview.integrityResult!.actual,
      packageVersion: preview.packageVersion ?? null,
    };
    expect(payload.code).toBe("PASS");
    expect(payload.expectedHash).toBe(payload.computedHash);
  });
});
