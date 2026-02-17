import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportPreviewPanel } from "@/app/ImportPreviewPanel";
import type { ImportPreview } from "@/app/ImportPreviewPanel";
import { analyzeImport } from "@/app/ImportPreviewPanel";
import { getAvailableActions } from "@/app/importPreviewModel";
import { localStorageSessionStore } from "@/infra/localStorageSessionStore";
import type { SessionResult } from "@/domain/types";

/**
 * Tests for Tickets 0244–0253.
 */

// ── Fixtures ─────────────────────────────────────────────────────────

function makeSession(id: string): SessionResult {
  return {
    id,
    config: {
      stimulusListId: "demo-10",
      stimulusListVersion: "1.0.0",
      maxResponseTimeMs: 0,
      orderPolicy: "fixed",
      seed: null,
    },
    trials: [],
    startedAt: "2026-02-17T00:00:00Z",
    completedAt: "2026-02-17T00:01:00Z",
    scoring: {
      trialFlags: [],
      summary: {
        totalTrials: 0, meanReactionTimeMs: 0, medianReactionTimeMs: 0,
        stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0,
        timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0,
      },
    },
    seedUsed: null,
    stimulusOrder: [],
    provenanceSnapshot: null,
    sessionFingerprint: "abc123def456",
    scoringVersion: null,
    appVersion: null,
    stimulusPackSnapshot: null,
  };
}

const passIntegrity = { valid: true, expected: "aabbcc", actual: "aabbcc" };
const failIntegrity = { valid: false, expected: "aabbcc", actual: "ddeeff" };

// pkg full: package + session + words
const fullPkgPreview: ImportPreview = {
  type: "package",
  packData: { id: "demo-10", version: "1.0.0", words: ["sun", "moon"] },
  wordCount: 2,
  hash: "testhash",
  schemaVersion: "sp_v1",
  sizeBytes: 1024,
  rawJson: "{}",
  integrityResult: passIntegrity,
  sessionToImport: makeSession("sess-1"),
  packageVersion: "pkg_v1",
  packageHash: "pkghash01",
};

// pkg minimal: no words
const minimalPkgPreview: ImportPreview = {
  type: "package",
  packData: {},
  wordCount: 0,
  hash: null,
  schemaVersion: null,
  sizeBytes: 512,
  rawJson: "{}",
  integrityResult: passIntegrity,
  sessionToImport: makeSession("sess-2"),
  packageVersion: "pkg_v1",
  packageHash: "pkghash02",
};

// pkg tampered: integrity FAIL
const tamperedPkgPreview: ImportPreview = {
  type: "package",
  packData: {},
  wordCount: 0,
  hash: null,
  schemaVersion: null,
  sizeBytes: 512,
  rawJson: "{}",
  integrityResult: failIntegrity,
  sessionToImport: null,
  packageVersion: "pkg_v1",
  packageHash: "pkghash03",
};

// ── 0244: Integrity diagnostics ──────────────────────────────────────

describe("0244 — ImportPreviewPanel integrity diagnostics", () => {
  it("shows PASS status when integrity passes", () => {
    render(
      <ImportPreviewPanel
        preview={fullPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/PASS/)).toBeTruthy();
  });

  it("shows FAIL status when integrity fails", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/FAIL — ERR_INTEGRITY_MISMATCH/)).toBeTruthy();
  });

  it("renders expected hash row when integrityResult present (FAIL)", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Expected hash")).toBeTruthy();
    expect(screen.getByText("aabbcc")).toBeTruthy();
  });

  it("renders computed hash row when integrityResult present (FAIL)", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Computed hash")).toBeTruthy();
    expect(screen.getByText("ddeeff")).toBeTruthy();
  });

  it("shows both hash rows when integrity passes too", () => {
    render(
      <ImportPreviewPanel
        preview={fullPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Expected hash")).toBeTruthy();
    expect(screen.getByText("Computed hash")).toBeTruthy();
  });

  it("renders Copy diagnostics button when integrityResult present", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Copy diagnostics")).toBeTruthy();
  });

  it("Copy diagnostics writes correct JSON payload to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText }, configurable: true,
    });

    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Copy diagnostics"));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const arg = writeText.mock.calls[0][0] as string;
    const parsed = JSON.parse(arg) as Record<string, unknown>;
    expect(parsed.code).toBe("ERR_INTEGRITY_MISMATCH");
    expect(parsed.expectedHash).toBe("aabbcc");
    expect(parsed.computedHash).toBe("ddeeff");
    expect(parsed.packageVersion).toBe("pkg_v1");
  });

  it("Copy diagnostics writes PASS code when integrity passes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText }, configurable: true,
    });

    render(
      <ImportPreviewPanel
        preview={fullPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Copy diagnostics"));

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const parsed = JSON.parse(writeText.mock.calls[0][0] as string) as Record<string, unknown>;
    expect(parsed.code).toBe("PASS");
  });
});

// ── 0245: Extract Pack button ─────────────────────────────────────────

describe("0245 — Extract Pack button", () => {
  it("shows Extract Pack button when package + wordCount > 0 + integrity PASS", () => {
    const onExtractPack = vi.fn();
    render(
      <ImportPreviewPanel
        preview={fullPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
        onExtractPack={onExtractPack}
      />,
    );
    expect(screen.getByRole("button", { name: /extract pack/i })).toBeTruthy();
  });

  it("does NOT show Extract Pack button when wordCount === 0 (minimal pkg)", () => {
    const onExtractPack = vi.fn();
    render(
      <ImportPreviewPanel
        preview={minimalPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
        onExtractPack={onExtractPack}
      />,
    );
    expect(screen.queryByRole("button", { name: /extract pack/i })).toBeNull();
  });

  it("does NOT show Extract Pack button when integrity FAIL", () => {
    const onExtractPack = vi.fn();
    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
        onExtractPack={onExtractPack}
      />,
    );
    expect(screen.queryByRole("button", { name: /extract pack/i })).toBeNull();
  });

  it("clicking Extract Pack calls onExtractPack", () => {
    const onExtractPack = vi.fn();
    render(
      <ImportPreviewPanel
        preview={fullPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
        onExtractPack={onExtractPack}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /extract pack/i }));
    expect(onExtractPack).toHaveBeenCalledOnce();
  });
});

// ── 0246: importedFrom persistence ───────────────────────────────────

describe("0246 — importedFrom round-trip persistence", () => {
  beforeEach(() => { localStorage.clear(); });

  it("persists importedFrom and reloads it", async () => {
    const session = {
      ...makeSession("imported-sess-1"),
      importedFrom: { packageVersion: "pkg_v1", packageHash: "abc123" },
    };
    await localStorageSessionStore.save(session);
    const loaded = await localStorageSessionStore.load("imported-sess-1");
    expect(loaded).toBeDefined();
    expect(loaded!.importedFrom).toEqual({ packageVersion: "pkg_v1", packageHash: "abc123" });
  });

  it("legacy session without importedFrom migrates to null", async () => {
    const raw = {
      schemaVersion: 2,
      sessions: {
        "legacy-sess": {
          id: "legacy-sess",
          config: { stimulusListId: "demo-10", stimulusListVersion: "1.0.0", maxResponseTimeMs: 0, orderPolicy: "fixed", seed: null },
          trials: [],
          startedAt: "2026-01-01T00:00:00Z",
          completedAt: "2026-01-01T00:01:00Z",
          scoring: { trialFlags: [], summary: { totalTrials: 0, meanReactionTimeMs: 0, medianReactionTimeMs: 0, stdDevReactionTimeMs: 0, emptyResponseCount: 0, repeatedResponseCount: 0, timingOutlierCount: 0, highEditingCount: 0, timeoutCount: 0 } },
          seedUsed: null,
          stimulusOrder: [],
          provenanceSnapshot: null,
          sessionFingerprint: null,
          scoringVersion: null,
          appVersion: null,
          // intentionally NO importedFrom field
        },
      },
    };
    localStorage.setItem("complex-mapper-sessions", JSON.stringify(raw));

    const loaded = await localStorageSessionStore.load("legacy-sess");
    expect(loaded).toBeDefined();
    expect(loaded!.importedFrom).toBeNull();
  });
});

// ── 0247: Collision safety ────────────────────────────────────────────

describe("0247 — Import collision safety (exists)", () => {
  beforeEach(() => { localStorage.clear(); });

  it("exists() returns true for saved session", async () => {
    await localStorageSessionStore.save(makeSession("check-sess"));
    expect(await localStorageSessionStore.exists("check-sess")).toBe(true);
  });

  it("exists() returns false for missing session", async () => {
    expect(await localStorageSessionStore.exists("never-saved")).toBe(false);
  });
});

// ── 0248: Available actions summary ──────────────────────────────────

describe("0248 — Available actions summary", () => {
  it("shows Import as Session + Extract Pack for valid full pkg", () => {
    render(
      <ImportPreviewPanel
        preview={fullPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
        onImportSession={() => {}} onExtractPack={() => {}}
      />,
    );
    expect(screen.getByText("Available actions")).toBeTruthy();
    expect(screen.getAllByText("Import as Session").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Extract Pack").length).toBeGreaterThanOrEqual(1);
  });

  it("shows only Import as Session for minimal/redacted pkg (no words)", () => {
    render(
      <ImportPreviewPanel
        preview={minimalPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
        onImportSession={() => {}} onExtractPack={() => {}}
      />,
    );
    expect(screen.getAllByText("Import as Session").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByText("Extract Pack").length).toBe(0);
  });

  it("shows Blocked for tampered pkg", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/Blocked: Integrity mismatch/)).toBeTruthy();
  });

  it("all import buttons disabled when integrity FAIL", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
        onImportSession={() => {}}
      />,
    );
    const importSessionBtn = screen.queryByRole("button", { name: /import as session/i });
    expect(importSessionBtn).toBeNull();
  });

  it("Copy diagnostics remains available when integrity FAIL", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    const copyBtn = screen.getByText("Copy diagnostics");
    expect(copyBtn).toBeTruthy();
    expect((copyBtn as HTMLButtonElement).disabled).toBe(false);
  });
});

// ── 0251: Clipboard fallback ──────────────────────────────────────────

describe("0251 — Clipboard failure fallback", () => {
  it("shows Copied confirmation on clipboard success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText }, configurable: true,
    });

    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Copy diagnostics"));
    await waitFor(() => expect(screen.getByText(/Copied ✓/)).toBeTruthy());
  });

  it("shows manual copy fallback textarea on clipboard failure", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("no clipboard"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText }, configurable: true,
    });

    render(
      <ImportPreviewPanel
        preview={tamperedPkgPreview}
        onConfirm={() => {}} onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Copy diagnostics"));
    await waitFor(() =>
      expect(screen.getByText(/Clipboard unavailable/)).toBeTruthy(),
    );
    const textarea = screen.getByRole("textbox", { name: /Diagnostics JSON/i });
    expect(textarea).toBeTruthy();
    const value = (textarea as HTMLTextAreaElement).value;
    const parsed = JSON.parse(value) as Record<string, unknown>;
    expect(parsed.code).toBe("ERR_INTEGRITY_MISMATCH");
  });
});

// ── 0252: originalSessionId in importedFrom ───────────────────────────

describe("0252 — originalSessionId in importedFrom", () => {
  beforeEach(() => { localStorage.clear(); });

  it("persists originalSessionId and reloads it", async () => {
    const session = {
      ...makeSession("orig-sess-1"),
      importedFrom: {
        packageVersion: "pkg_v1",
        packageHash: "abc123",
        originalSessionId: "original-id-before-collision",
      },
    };
    await localStorageSessionStore.save(session);
    const loaded = await localStorageSessionStore.load("orig-sess-1");
    expect(loaded).toBeDefined();
    expect(loaded!.importedFrom?.originalSessionId).toBe("original-id-before-collision");
  });

  it("legacy session without originalSessionId is safe (no crash)", async () => {
    const session = {
      ...makeSession("legacy-import"),
      importedFrom: { packageVersion: "pkg_v1", packageHash: "xyz789" },
    };
    await localStorageSessionStore.save(session);
    const loaded = await localStorageSessionStore.load("legacy-import");
    expect(loaded).toBeDefined();
    // originalSessionId is optional — should be undefined (not error)
    expect(loaded!.importedFrom?.originalSessionId).toBeUndefined();
  });
});

// ── 0253: getAvailableActions SSoT ───────────────────────────────────

describe("0253 — getAvailableActions single source of truth", () => {
  it("valid pkg full → Import as Session + Extract Pack", () => {
    const actions = getAvailableActions(fullPkgPreview, false);
    expect(actions).toContain("Import as Session");
    expect(actions).toContain("Extract Pack");
    expect(actions).not.toContain("Blocked: Integrity mismatch");
  });

  it("valid pkg minimal/redacted → Import as Session only", () => {
    const actions = getAvailableActions(minimalPkgPreview, false);
    expect(actions).toContain("Import as Session");
    expect(actions).not.toContain("Extract Pack");
  });

  it("tampered pkg → Blocked only", () => {
    const actions = getAvailableActions(tamperedPkgPreview, true);
    expect(actions).toEqual(["Blocked: Integrity mismatch"]);
  });

  it("bundle → Import Pack", () => {
    const bundlePreview: ImportPreview = {
      type: "bundle",
      packData: { id: "test", version: "1.0.0", words: ["a"] },
      wordCount: 1,
      hash: null,
      schemaVersion: null,
      sizeBytes: 100,
      rawJson: "{}",
    };
    const actions = getAvailableActions(bundlePreview, false);
    expect(actions).toEqual(["Import Pack"]);
  });

  it("pack JSON → Import Pack", () => {
    const packPreview: ImportPreview = {
      type: "pack",
      packData: { id: "test", version: "1.0.0", words: ["a"] },
      wordCount: 1,
      hash: null,
      schemaVersion: null,
      sizeBytes: 100,
      rawJson: "{}",
    };
    const actions = getAvailableActions(packPreview, false);
    expect(actions).toEqual(["Import Pack"]);
  });
});

// ── analyzeImport unit tests ──────────────────────────────────────────

describe("analyzeImport", () => {
  it("detects package type and captures packageVersion + packageHash", () => {
    const parsed = {
      packageVersion: "pkg_v1",
      packageHash: "hashval",
      bundle: {},
    };
    const result = analyzeImport(parsed, "{}");
    expect(result).toBeDefined();
    expect(result!.type).toBe("package");
    expect(result!.packageVersion).toBe("pkg_v1");
    expect(result!.packageHash).toBe("hashval");
  });

  it("detects bundle type", () => {
    const parsed = {
      exportSchemaVersion: "rb_v3",
      stimulusPackSnapshot: {
        words: ["sun", "moon"],
        stimulusSchemaVersion: "sp_v1",
        stimulusListHash: "abc",
        provenance: {
          listId: "test-pack", listVersion: "1.0.0", language: "en", source: "test",
          sourceName: "Test", sourceYear: "2020", sourceCitation: "Test 2020", licenseNote: "CC",
        },
      },
    };
    const result = analyzeImport(parsed, "{}");
    expect(result).toBeDefined();
    expect(result!.type).toBe("bundle");
  });

  it("detects pack type", () => {
    const parsed = { id: "my-pack", version: "1.0.0", words: ["a"] };
    const result = analyzeImport(parsed, "{}");
    expect(result).toBeDefined();
    expect(result!.type).toBe("pack");
  });
});
