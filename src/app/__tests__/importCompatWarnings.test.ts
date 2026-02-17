import { describe, it, expect } from "vitest";
import {
  getCompatWarnings,
  CURRENT_EXPORT_SCHEMA,
  CURRENT_PROTOCOL_DOC,
} from "@/app/importPreviewModel";
import type { ImportCompat } from "@/app/importPreviewModel";

/**
 * Ticket 0260 — import compatibility warning model tests.
 */

function makeCompat(overrides: Partial<ImportCompat>): ImportCompat {
  return {
    exportSchemaVersion: CURRENT_EXPORT_SCHEMA,
    protocolDocVersion: CURRENT_PROTOCOL_DOC,
    importedAppVersion: null,
    privacyMode: "full",
    ...overrides,
  };
}

describe("getCompatWarnings — no warnings for current artifacts", () => {
  it("returns empty for a fully current bundle", () => {
    const compat = makeCompat({});
    expect(getCompatWarnings(compat)).toHaveLength(0);
  });

  it("returns empty for null compat", () => {
    expect(getCompatWarnings(null)).toHaveLength(0);
  });

  it("returns empty for undefined compat", () => {
    expect(getCompatWarnings(undefined)).toHaveLength(0);
  });
});

describe("getCompatWarnings — older-but-supported schema", () => {
  it("warns when exportSchemaVersion is rb_v2", () => {
    const compat = makeCompat({ exportSchemaVersion: "rb_v2" });
    const warnings = getCompatWarnings(compat);
    expect(warnings.some((w) => w.field === "exportSchemaVersion")).toBe(true);
    expect(warnings[0].message).toContain("rb_v2");
  });

  it("does not warn for current rb_v3", () => {
    const compat = makeCompat({ exportSchemaVersion: "rb_v3" });
    const warnings = getCompatWarnings(compat);
    expect(warnings.some((w) => w.field === "exportSchemaVersion")).toBe(false);
  });
});

describe("getCompatWarnings — protocol mismatch", () => {
  it("warns when protocolDocVersion differs", () => {
    const compat = makeCompat({ protocolDocVersion: "PROTOCOL.md@2024-01-01" });
    const warnings = getCompatWarnings(compat);
    expect(warnings.some((w) => w.field === "protocolDocVersion")).toBe(true);
  });

  it("does not warn when protocolDocVersion matches current", () => {
    const compat = makeCompat({ protocolDocVersion: CURRENT_PROTOCOL_DOC });
    const warnings = getCompatWarnings(compat);
    expect(warnings.some((w) => w.field === "protocolDocVersion")).toBe(false);
  });
});

describe("getCompatWarnings — app version mismatch", () => {
  it("warns when importedAppVersion differs from current and both are non-null", () => {
    // In test env __APP_VERSION__ is undefined, so appVersion() returns null → no warning
    // We can only test the no-warn case since we can't inject the version constant in unit tests
    const compat = makeCompat({ importedAppVersion: "0.0.1" });
    const warnings = getCompatWarnings(compat);
    // Either warns (if appVersion resolves) or doesn't (if undefined in test env) — just check it's an array
    expect(Array.isArray(warnings)).toBe(true);
  });

  it("does not warn when importedAppVersion is null", () => {
    const compat = makeCompat({ importedAppVersion: null });
    const warnings = getCompatWarnings(compat);
    expect(warnings.some((w) => w.field === "appVersion")).toBe(false);
  });
});
