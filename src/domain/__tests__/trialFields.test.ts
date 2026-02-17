/**
 * Tests for trialFields.ts — Ticket 0271.
 */

import { describe, it, expect } from "vitest";
import {
  getResponseText,
  getResponseLen,
  getTimedOut,
  getBackspaces,
  getEdits,
  getCompositions,
  getFirstKeyMs,
} from "../trialFields";
import type { Trial } from "../types";

function makeTrial(overrides: Partial<Trial["association"]> & { timedOut?: boolean } = {}): Trial {
  return {
    stimulus: { word: "test", index: 0 },
    association: {
      response: overrides.response ?? "test",
      reactionTimeMs: overrides.reactionTimeMs ?? 400,
      tFirstKeyMs: overrides.tFirstKeyMs ?? null,
      backspaceCount: overrides.backspaceCount ?? 0,
      editCount: overrides.editCount ?? 1,
      compositionCount: overrides.compositionCount ?? 0,
    },
    isPractice: false,
    timedOut: overrides.timedOut,
  };
}

describe("getResponseText", () => {
  it("returns association.response string", () => {
    expect(getResponseText(makeTrial({ response: "hello" }))).toBe("hello");
  });

  it("returns empty string when response is empty", () => {
    expect(getResponseText(makeTrial({ response: "" }))).toBe("");
  });
});

describe("getResponseLen", () => {
  it("returns length of response", () => {
    expect(getResponseLen(makeTrial({ response: "abc" }))).toBe(3);
  });

  it("returns 0 for empty response", () => {
    expect(getResponseLen(makeTrial({ response: "" }))).toBe(0);
  });
});

describe("getTimedOut", () => {
  it("returns true when trial.timedOut is true, ignoring flags", () => {
    expect(getTimedOut(makeTrial({ timedOut: true }), [])).toBe(true);
  });

  it("returns true from 'timeout' flag when field not set", () => {
    expect(getTimedOut(makeTrial(), ["timeout"])).toBe(true);
  });

  it("returns true from 'timed_out' flag when field not set", () => {
    expect(getTimedOut(makeTrial(), ["timed_out"])).toBe(true);
  });

  it("returns false when no timedOut field and no timeout flags", () => {
    expect(getTimedOut(makeTrial(), ["empty_response"])).toBe(false);
  });

  it("returns false when timedOut is undefined and no flags", () => {
    expect(getTimedOut(makeTrial(), [])).toBe(false);
  });
});

describe("getBackspaces", () => {
  it("returns backspaceCount", () => {
    expect(getBackspaces(makeTrial({ backspaceCount: 3 }))).toBe(3);
  });
});

describe("getEdits", () => {
  it("returns editCount", () => {
    expect(getEdits(makeTrial({ editCount: 5 }))).toBe(5);
  });
});

describe("getCompositions", () => {
  it("returns compositionCount", () => {
    expect(getCompositions(makeTrial({ compositionCount: 2 }))).toBe(2);
  });
});

describe("getFirstKeyMs", () => {
  it("returns tFirstKeyMs when present", () => {
    expect(getFirstKeyMs(makeTrial({ tFirstKeyMs: 120 }))).toBe(120);
  });

  it("returns null when tFirstKeyMs is null", () => {
    expect(getFirstKeyMs(makeTrial({ tFirstKeyMs: null }))).toBeNull();
  });
});
