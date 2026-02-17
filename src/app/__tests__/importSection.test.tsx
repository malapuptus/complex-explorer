import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImportPreviewPanel } from "@/app/ImportPreviewPanel";
import { getAvailableActions } from "@/app/importPreviewModel";
import type { ImportPreview } from "@/app/importPreviewModel";

/**
 * Ticket 0256 — ImportSection UI tests for copy+fallback+gating parity.
 * Asserts: action list matches buttons, copy UX works, fallback appears on failure.
 */

// ── Fixtures ─────────────────────────────────────────────────────────

const passIntegrity = { valid: true, expected: "aabb1122", actual: "aabb1122" };
const failIntegrity = { valid: false, expected: "aabb1122", actual: "ccdd3344" };

const fakeSession = {
  id: "sess-1", config: {}, trials: [], startedAt: "", completedAt: "",
  scoring: { trialFlags: [], summary: {} }, seedUsed: null,
  stimulusOrder: [], provenanceSnapshot: null, sessionFingerprint: null,
  scoringVersion: null, appVersion: null, stimulusPackSnapshot: null,
};

// valid full pkg: session + words + PASS
const fullPkg: ImportPreview = {
  type: "package",
  packData: { id: "full-pack", version: "1.0.0", words: ["sun", "moon"] },
  wordCount: 2,
  hash: "hashfull",
  schemaVersion: "sp_v1",
  sizeBytes: 2048,
  rawJson: "{}",
  integrityResult: passIntegrity,
  sessionToImport: fakeSession as never,
  packageVersion: "pkg_v1",
  packageHash: "validhash01",
};

// valid minimal pkg: session + no words + PASS
const minimalPkg: ImportPreview = {
  type: "package",
  packData: {},
  wordCount: 0,
  hash: null,
  schemaVersion: null,
  sizeBytes: 512,
  rawJson: "{}",
  integrityResult: passIntegrity,
  sessionToImport: fakeSession as never,
  packageVersion: "pkg_v1",
  packageHash: "validhash02",
};

// tampered pkg: integrity FAIL
const tamperedPkg: ImportPreview = {
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
  packageHash: "badhash00",
};

// ── Gating parity: action list == button visibility ───────────────────

describe("0256 — Gating parity: Available actions list matches rendered buttons", () => {
  it("valid full pkg: action list includes Import as Session + Extract Pack", () => {
    const actions = getAvailableActions(fullPkg, false);
    expect(actions).toContain("Import as Session");
    expect(actions).toContain("Extract Pack");
  });

  it("valid full pkg: both buttons are rendered", () => {
    render(
      <ImportPreviewPanel
        preview={fullPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
        onImportSession={() => {}}
        onExtractPack={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /import as session/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /extract pack/i })).toBeTruthy();
  });

  it("valid minimal pkg: action list has Import as Session only", () => {
    const actions = getAvailableActions(minimalPkg, false);
    expect(actions).toContain("Import as Session");
    expect(actions).not.toContain("Extract Pack");
  });

  it("valid minimal pkg: extract pack button not rendered", () => {
    render(
      <ImportPreviewPanel
        preview={minimalPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
        onImportSession={() => {}}
        onExtractPack={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /import as session/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /extract pack/i })).toBeNull();
  });

  it("tampered pkg: action list is Blocked only", () => {
    const actions = getAvailableActions(tamperedPkg, true);
    expect(actions).toEqual(["Blocked: Integrity mismatch"]);
  });

  it("tampered pkg: import buttons absent/disabled, diagnostics available", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
        onImportSession={() => {}}
        onExtractPack={() => {}}
      />,
    );
    // Import as Session button not rendered when integrity fails
    expect(screen.queryByRole("button", { name: /import as session/i })).toBeNull();
    // Extract pack not rendered either
    expect(screen.queryByRole("button", { name: /extract pack/i })).toBeNull();
    // Copy diagnostics IS available
    const copyBtn = screen.getByText("Copy diagnostics") as HTMLButtonElement;
    expect(copyBtn.disabled).toBe(false);
    // Cancel is available
    expect(screen.getByRole("button", { name: /cancel/i })).toBeTruthy();
  });

  it("available actions text in UI matches getAvailableActions() result — full pkg", () => {
    const expectedActions = getAvailableActions(fullPkg, false);
    render(
      <ImportPreviewPanel
        preview={fullPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
        onImportSession={() => {}}
        onExtractPack={() => {}}
      />,
    );
    // Both actions appear in the bulleted list
    for (const action of expectedActions) {
      expect(screen.getAllByText(action).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("available actions text in UI matches getAvailableActions() result — tampered", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/Blocked: Integrity mismatch/)).toBeTruthy();
  });
});

// ── Copy diagnostics UX ───────────────────────────────────────────────

describe("0256 — Copy diagnostics UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clipboard success → shows Copied ✓ feedback", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText }, configurable: true,
    });

    render(
      <ImportPreviewPanel
        preview={tamperedPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Copy diagnostics"));
    await waitFor(() => expect(screen.getByText(/Copied ✓/)).toBeTruthy());
    expect(writeText).toHaveBeenCalledOnce();
  });

  it("clipboard failure → fallback textarea appears with JSON payload", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText }, configurable: true,
    });

    render(
      <ImportPreviewPanel
        preview={tamperedPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Copy diagnostics"));
    await waitFor(() =>
      expect(screen.getByText(/Clipboard unavailable/)).toBeTruthy(),
    );
    const textarea = screen.getByRole("textbox", { name: /diagnostics JSON/i }) as HTMLTextAreaElement;
    const parsed = JSON.parse(textarea.value) as Record<string, unknown>;
    expect(parsed).toHaveProperty("code");
    expect(parsed).toHaveProperty("expectedHash");
    expect(parsed).toHaveProperty("computedHash");
    expect(parsed).toHaveProperty("packageVersion");
  });

  it("clipboard failure with PASS integrity → payload code is PASS", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("no clipboard"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText }, configurable: true,
    });

    render(
      <ImportPreviewPanel
        preview={fullPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Copy diagnostics"));
    await waitFor(() =>
      expect(screen.getByText(/Clipboard unavailable/)).toBeTruthy(),
    );
    const textarea = screen.getByRole("textbox", { name: /diagnostics JSON/i }) as HTMLTextAreaElement;
    const parsed = JSON.parse(textarea.value) as Record<string, unknown>;
    expect(parsed.code).toBe("PASS");
  });
});

// ── Integrity diagnostics rows in UI ─────────────────────────────────

describe("0256 — Integrity diagnostics rows", () => {
  it("FAIL shows expected and computed hash values", () => {
    render(
      <ImportPreviewPanel
        preview={tamperedPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("aabb1122")).toBeTruthy();
    expect(screen.getByText("ccdd3344")).toBeTruthy();
  });

  it("PASS shows matching hashes (both rows present)", () => {
    render(
      <ImportPreviewPanel
        preview={fullPkg}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getAllByText("aabb1122").length).toBeGreaterThanOrEqual(2);
  });
});
