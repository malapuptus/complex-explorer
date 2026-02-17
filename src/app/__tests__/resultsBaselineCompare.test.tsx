/**
 * Tests for baseline compare flow — Ticket 0267.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { uiPrefs } from "@/infra";

beforeEach(() => {
  localStorage.clear();
});

describe("baseline prefs roundtrip", () => {
  it("defaults to null", () => {
    expect(uiPrefs.getBaselineSessionId()).toBeNull();
  });

  it("roundtrips setBaselineSessionId", () => {
    uiPrefs.setBaselineSessionId("sess-123");
    expect(uiPrefs.getBaselineSessionId()).toBe("sess-123");
  });

  it("clearing baseline sets it to null", () => {
    uiPrefs.setBaselineSessionId("sess-abc");
    uiPrefs.setBaselineSessionId(null);
    expect(uiPrefs.getBaselineSessionId()).toBeNull();
  });
});
