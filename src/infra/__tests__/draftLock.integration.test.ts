import { describe, it, expect, beforeEach } from "vitest";
import { localStorageSessionStore } from "../localStorageSessionStore";
import { DRAFT_LOCK_TTL_MS } from "@/domain";

/**
 * Ticket 0189 — Cross-tab lock integration test.
 * Simulates two "tabs" using two store references with different tab IDs.
 */

describe("Cross-tab draft lock integration", () => {
  const TAB_A = "tab-alpha";
  const TAB_B = "tab-beta";

  beforeEach(() => {
    localStorage.clear();
  });

  it("tab B cannot acquire lock while tab A holds it", () => {
    expect(localStorageSessionStore.acquireDraftLock(TAB_A)).toBe(true);
    expect(localStorageSessionStore.acquireDraftLock(TAB_B)).toBe(false);
    expect(localStorageSessionStore.isDraftLockedByOther(TAB_B)).toBe(true);
  });

  it("tab B sees no lock after tab A releases", () => {
    localStorageSessionStore.acquireDraftLock(TAB_A);
    localStorageSessionStore.releaseDraftLock(TAB_A);
    expect(localStorageSessionStore.isDraftLockedByOther(TAB_B)).toBe(false);
    expect(localStorageSessionStore.acquireDraftLock(TAB_B)).toBe(true);
  });

  it("tab B cannot release tab A's lock", () => {
    localStorageSessionStore.acquireDraftLock(TAB_A);
    localStorageSessionStore.releaseDraftLock(TAB_B);
    // Lock should still be held by A
    expect(localStorageSessionStore.isDraftLockedByOther(TAB_B)).toBe(true);
  });

  it("tab B can acquire lock after TTL expiry", () => {
    // Manually write an expired lock for tab A
    const expired = {
      tabId: TAB_A,
      acquiredAtMs: Date.now() - DRAFT_LOCK_TTL_MS - 1,
    };
    localStorage.setItem("complex-mapper-draft-lock", JSON.stringify(expired));

    expect(localStorageSessionStore.isDraftLockedByOther(TAB_B)).toBe(false);
    expect(localStorageSessionStore.acquireDraftLock(TAB_B)).toBe(true);
  });

  it("concurrent draft saves don't overwrite each other's data", async () => {
    // Tab A acquires lock and saves draft
    localStorageSessionStore.acquireDraftLock(TAB_A);
    await localStorageSessionStore.saveDraft({
      id: "draft-A",
      stimulusListId: "demo-10",
      stimulusListVersion: "1.0.0",
      orderPolicy: "fixed",
      seedUsed: null,
      wordList: ["sun"],
      practiceWords: [],
      stimulusOrder: ["sun"],
      trials: [],
      currentIndex: 0,
      savedAt: new Date().toISOString(),
    });

    // Tab B should not be able to acquire lock
    expect(localStorageSessionStore.acquireDraftLock(TAB_B)).toBe(false);

    // Tab A's draft should still be intact
    const draft = await localStorageSessionStore.loadDraft();
    expect(draft).not.toBeNull();
    expect(draft!.id).toBe("draft-A");
  });
});
