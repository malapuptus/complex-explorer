import { describe, it, expect, beforeEach, vi } from "vitest";
import { localStorageSessionStore } from "../localStorageSessionStore";
import { DRAFT_LOCK_TTL_MS } from "@/domain";

describe("draft lock", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("acquires lock when no lock exists", () => {
    expect(localStorageSessionStore.acquireDraftLock("tab-1")).toBe(true);
  });

  it("allows same tab to re-acquire lock", () => {
    localStorageSessionStore.acquireDraftLock("tab-1");
    expect(localStorageSessionStore.acquireDraftLock("tab-1")).toBe(true);
  });

  it("blocks a different tab from acquiring a live lock", () => {
    localStorageSessionStore.acquireDraftLock("tab-1");
    expect(localStorageSessionStore.acquireDraftLock("tab-2")).toBe(false);
  });

  it("isDraftLockedByOther returns false for same tab", () => {
    localStorageSessionStore.acquireDraftLock("tab-1");
    expect(localStorageSessionStore.isDraftLockedByOther("tab-1")).toBe(false);
  });

  it("isDraftLockedByOther returns true for different tab", () => {
    localStorageSessionStore.acquireDraftLock("tab-1");
    expect(localStorageSessionStore.isDraftLockedByOther("tab-2")).toBe(true);
  });

  it("allows acquisition after TTL expires", () => {
    localStorageSessionStore.acquireDraftLock("tab-1");

    // Manually write an expired lock
    const expired = {
      tabId: "tab-1",
      acquiredAtMs: Date.now() - DRAFT_LOCK_TTL_MS - 1,
    };
    localStorage.setItem(
      "complex-mapper-draft-lock",
      JSON.stringify(expired),
    );

    expect(localStorageSessionStore.acquireDraftLock("tab-2")).toBe(true);
  });

  it("isDraftLockedByOther returns false after TTL expires", () => {
    const expired = {
      tabId: "tab-1",
      acquiredAtMs: Date.now() - DRAFT_LOCK_TTL_MS - 1,
    };
    localStorage.setItem(
      "complex-mapper-draft-lock",
      JSON.stringify(expired),
    );

    expect(localStorageSessionStore.isDraftLockedByOther("tab-2")).toBe(false);
  });

  it("release only works for the owning tab", () => {
    localStorageSessionStore.acquireDraftLock("tab-1");
    localStorageSessionStore.releaseDraftLock("tab-2"); // should not release
    expect(localStorageSessionStore.isDraftLockedByOther("tab-2")).toBe(true);

    localStorageSessionStore.releaseDraftLock("tab-1"); // should release
    expect(localStorageSessionStore.isDraftLockedByOther("tab-2")).toBe(false);
  });
});
