import { describe, it, expect } from "vitest";
import { bundleFilename, packageFilename, csvFilename, packFilename } from "@/domain/exportFilenames";

/**
 * Ticket 0259 — deterministic export filenames.
 */

const NOW = new Date("2026-02-17T14:30:00Z");
const HASH = "deadbeefcafe1234deadbeefcafe1234";

// ── filesystem safety helpers ────────────────────────────────────────

function isFilesystemSafe(name: string): boolean {
  return (
    !/[\s/\\:*?"<>|]/.test(name) && // no forbidden chars
    name.length <= 128 &&             // reasonable length cap
    name.length > 0
  );
}

// ── bundleFilename ────────────────────────────────────────────────────

describe("bundleFilename", () => {
  it("contains rb_v3 token", () => {
    const n = bundleFilename({ mode: "full", now: NOW });
    expect(n).toContain("rb_v3");
  });

  it("contains app slug cm", () => {
    const n = bundleFilename({ mode: "full", now: NOW });
    expect(n).toContain("cm");
  });

  it("contains privacy mode 'full'", () => {
    const n = bundleFilename({ mode: "full", now: NOW });
    expect(n).toContain("full");
  });

  it("contains privacy mode 'redacted'", () => {
    const n = bundleFilename({ mode: "redacted", now: NOW });
    expect(n).toContain("redacted");
  });

  it("contains hash prefix (8-10 chars)", () => {
    const n = bundleFilename({ mode: "full", hashPrefix: HASH, now: NOW });
    expect(n).toContain(HASH.slice(0, 8));
  });

  it("contains date YYYYMMDD", () => {
    const n = bundleFilename({ mode: "full", now: NOW });
    expect(n).toContain("20260217");
  });

  it("contains time HHmm", () => {
    const n = bundleFilename({ mode: "full", now: NOW });
    expect(n).toContain("1430");
  });

  it("ends with .json", () => {
    expect(bundleFilename({ mode: "full", now: NOW })).toMatch(/\.json$/);
  });

  it("is filesystem-safe", () => {
    expect(isFilesystemSafe(bundleFilename({ mode: "full", hashPrefix: HASH, now: NOW }))).toBe(true);
  });

  it("no spaces in filename", () => {
    expect(bundleFilename({ mode: "minimal", hashPrefix: HASH, now: NOW })).not.toMatch(/\s/);
  });
});

// ── packageFilename ───────────────────────────────────────────────────

describe("packageFilename", () => {
  it("contains pkg_v1 token", () => {
    expect(packageFilename({ mode: "full", packageHash: HASH, now: NOW })).toContain("pkg_v1");
  });

  it("contains privacy mode", () => {
    expect(packageFilename({ mode: "minimal", now: NOW })).toContain("minimal");
  });

  it("contains hash prefix", () => {
    const n = packageFilename({ mode: "full", packageHash: HASH, now: NOW });
    expect(n).toContain(HASH.slice(0, 8));
  });

  it("contains date", () => {
    expect(packageFilename({ mode: "full", now: NOW })).toContain("20260217");
  });

  it("ends with .json", () => {
    expect(packageFilename({ mode: "full", now: NOW })).toMatch(/\.json$/);
  });

  it("is filesystem-safe", () => {
    expect(isFilesystemSafe(packageFilename({ mode: "full", packageHash: HASH, now: NOW }))).toBe(true);
  });
});

// ── csvFilename ───────────────────────────────────────────────────────

describe("csvFilename", () => {
  it("contains csv_v1 token", () => {
    expect(csvFilename({ now: NOW })).toContain("csv_v1");
  });

  it("does NOT contain 'redacted' for full CSV", () => {
    expect(csvFilename({ redacted: false, now: NOW })).not.toContain("redacted");
  });

  it("contains 'redacted' for redacted CSV", () => {
    expect(csvFilename({ redacted: true, now: NOW })).toContain("redacted");
  });

  it("contains date", () => {
    expect(csvFilename({ now: NOW })).toContain("20260217");
  });

  it("ends with .csv", () => {
    expect(csvFilename({ now: NOW })).toMatch(/\.csv$/);
  });

  it("is filesystem-safe", () => {
    expect(isFilesystemSafe(csvFilename({ redacted: true, now: NOW }))).toBe(true);
  });
});

// ── packFilename ──────────────────────────────────────────────────────

describe("packFilename", () => {
  it("contains pack token", () => {
    expect(packFilename({ id: "my-pack", version: "1.0.0", now: NOW })).toContain("pack");
  });

  it("contains pack id", () => {
    expect(packFilename({ id: "my-pack", version: "1.0.0", now: NOW })).toContain("my-pack");
  });

  it("contains version", () => {
    expect(packFilename({ id: "my-pack", version: "1.0.0", now: NOW })).toContain("1.0.0");
  });

  it("is filesystem-safe with special chars in id", () => {
    const n = packFilename({ id: "pack with spaces/slashes", version: "1.0.0", now: NOW });
    expect(isFilesystemSafe(n)).toBe(true);
  });

  it("ends with .json", () => {
    expect(packFilename({ id: "p", version: "1", now: NOW })).toMatch(/\.json$/);
  });
});
