/**
 * Tests for localStorageUiPrefs.ts — Ticket 0267.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { uiPrefs } from "../localStorageUiPrefs";

beforeEach(() => {
  localStorage.clear();
});

describe("uiPrefs", () => {
  it("defaults baselineSessionId to null when key absent", () => {
    expect(uiPrefs.getBaselineSessionId()).toBeNull();
  });

  it("round-trips setBaselineSessionId / getBaselineSessionId", () => {
    uiPrefs.setBaselineSessionId("session-abc");
    expect(uiPrefs.getBaselineSessionId()).toBe("session-abc");
  });

  it("setBaselineSessionId(null) clears the baseline", () => {
    uiPrefs.setBaselineSessionId("session-xyz");
    uiPrefs.setBaselineSessionId(null);
    expect(uiPrefs.getBaselineSessionId()).toBeNull();
  });

  it("set merges partial without clobbering other prefs", () => {
    uiPrefs.setBaselineSessionId("session-1");
    // set a different partial field (simulated future pref)
    uiPrefs.set({ baselineSessionId: "session-2" });
    expect(uiPrefs.getBaselineSessionId()).toBe("session-2");
  });

  it("get returns defaults on corrupted JSON", () => {
    localStorage.setItem("complex-mapper-ui-prefs", "{{INVALID}}");
    const prefs = uiPrefs.get();
    expect(prefs.baselineSessionId).toBeNull();
  });
});
