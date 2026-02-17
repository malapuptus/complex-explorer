import { describe, it, expect, beforeEach } from "vitest";

/**
 * Ticket 0242 — Atomic write coverage for packs + session imports.
 * Verifies staging-key → commit-key recovery for both stores.
 */

const SESSION_KEY = "complex-mapper-sessions";
const PACK_KEY = "complex-mapper-custom-packs";

beforeEach(() => {
  localStorage.clear();
});

describe("Pack store atomic writes (0242)", () => {
  it("discards staging-only pack write (crash recovery)", async () => {
    // Simulate crash: staging written but commit never happened
    localStorage.setItem(PACK_KEY + "__staging", JSON.stringify({ packs: { "bad@1": { id: "bad" } } }));
    // No main key

    const { localStorageStimulusStore } = await import("../localStorageStimulusStore");
    const list = localStorageStimulusStore.list();
    expect(list).toHaveLength(0);
    // Staging should be cleaned up
    expect(localStorage.getItem(PACK_KEY + "__staging")).toBeNull();
  });

  it("cleans up leftover staging when main exists", async () => {
    const goodData = { packs: {} };
    localStorage.setItem(PACK_KEY, JSON.stringify(goodData));
    localStorage.setItem(PACK_KEY + "__staging", JSON.stringify({ packs: { "stale@1": {} } }));

    const { localStorageStimulusStore } = await import("../localStorageStimulusStore");
    const list = localStorageStimulusStore.list();
    expect(list).toHaveLength(0);
    expect(localStorage.getItem(PACK_KEY + "__staging")).toBeNull();
  });

  it("normal write creates no leftover staging", async () => {
    const { localStorageStimulusStore } = await import("../localStorageStimulusStore");
    localStorageStimulusStore.save({
      id: "test", version: "1.0", language: "en", source: "test",
      provenance: { sourceName: "T", sourceYear: "2026", sourceCitation: "C", licenseNote: "L" },
      words: ["a", "b"],
    } as never);
    expect(localStorage.getItem(PACK_KEY + "__staging")).toBeNull();
    expect(localStorage.getItem(PACK_KEY)).toBeTruthy();
    const list = localStorageStimulusStore.list();
    expect(list).toHaveLength(1);
  });
});

describe("Session store atomic writes (0242)", () => {
  it("discards staging-only session write (crash recovery)", async () => {
    localStorage.setItem(SESSION_KEY + "__staging", JSON.stringify({ schemaVersion: 3, sessions: { "s1": { id: "s1" } } }));

    const { localStorageSessionStore } = await import("../localStorageSessionStore");
    const list = await localStorageSessionStore.list();
    expect(list).toHaveLength(0);
    expect(localStorage.getItem(SESSION_KEY + "__staging")).toBeNull();
  });

  it("cleans up leftover staging when main exists", async () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ schemaVersion: 3, sessions: {} }));
    localStorage.setItem(SESSION_KEY + "__staging", JSON.stringify({ schemaVersion: 3, sessions: { "stale": {} } }));

    const { localStorageSessionStore } = await import("../localStorageSessionStore");
    const list = await localStorageSessionStore.list();
    expect(list).toHaveLength(0);
    expect(localStorage.getItem(SESSION_KEY + "__staging")).toBeNull();
  });
});
