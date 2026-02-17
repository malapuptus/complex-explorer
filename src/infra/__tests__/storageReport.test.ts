import { describe, it, expect, beforeEach } from "vitest";
import { buildStorageReport } from "@/infra/storageReport";

/**
 * Ticket 0262 — Storage report tests.
 */

const SESSION_KEY = "complex-mapper-sessions";
const PACK_KEY = "complex-mapper-custom-packs";

function seedSessions(n: number, imported = false) {
  const sessions: Record<string, unknown> = {};
  for (let i = 0; i < n; i++) {
    const id = `session-${i}`;
    sessions[id] = {
      id,
      config: { stimulusListId: "demo-10", stimulusListVersion: "1.0.0" },
      trials: [{ stimulus: { word: "sun", index: 0 }, association: { response: "moon", reactionTimeMs: 300, tFirstKeyMs: 100, backspaceCount: 0, editCount: 1, compositionCount: 0 }, isPractice: false }],
      _imported: imported,
    };
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ schemaVersion: 3, sessions }));
}

function seedPacks(n: number) {
  const packs: Record<string, unknown> = {};
  for (let i = 0; i < n; i++) {
    const key = `pack-${i}@1.0.0`;
    packs[key] = { id: `pack-${i}`, version: "1.0.0", words: ["sun"], importedAt: "2026-01-01T00:00:00Z" };
  }
  localStorage.setItem(PACK_KEY, JSON.stringify({ packs }));
}

beforeEach(() => {
  localStorage.clear();
});

describe("buildStorageReport", () => {
  it("returns generatedAt ISO string", () => {
    const report = buildStorageReport();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("sessions.totalCount matches seeded sessions", () => {
    seedSessions(5);
    const report = buildStorageReport();
    expect(report.sessions.totalCount).toBe(5);
  });

  it("packs.totalCount matches seeded packs", () => {
    seedPacks(3);
    const report = buildStorageReport();
    expect(report.packs.totalCount).toBe(3);
  });

  it("largest10 is capped at 10", () => {
    seedSessions(15);
    const report = buildStorageReport();
    expect(report.sessions.largest10.length).toBeLessThanOrEqual(10);
  });

  it("imported flag is set correctly for imported sessions", () => {
    seedSessions(2, true);
    const report = buildStorageReport();
    expect(report.sessions.largest10.every((s) => s.imported)).toBe(true);
  });

  it("returns zero counts when stores are empty", () => {
    const report = buildStorageReport();
    expect(report.sessions.totalCount).toBe(0);
    expect(report.packs.totalCount).toBe(0);
  });

  it("approximateKB is a non-negative number", () => {
    seedSessions(3);
    const report = buildStorageReport();
    expect(report.sessions.approximateKB).toBeGreaterThanOrEqual(0);
  });

  it("report has correct shape", () => {
    const report = buildStorageReport();
    expect(report).toHaveProperty("sessions.totalCount");
    expect(report).toHaveProperty("sessions.approximateKB");
    expect(report).toHaveProperty("sessions.largest10");
    expect(report).toHaveProperty("packs.totalCount");
    expect(report).toHaveProperty("packs.approximateKB");
    expect(report).toHaveProperty("packs.largest10");
  });
});
