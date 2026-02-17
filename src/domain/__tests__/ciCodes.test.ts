/**
 * ciCodes.test.ts — table-driven tests for computeCiCodesForTrial.
 * Ticket 0277.
 */

import { describe, it, expect } from "vitest";
import type { Trial } from "@/domain";
import { computeCiCodesForTrial, aggregateCiCounts } from "@/domain";

function makeTrial(response: string, timedOut = false): Trial {
  return {
    stimulus: { word: "test", index: 0 },
    association: {
      response,
      reactionTimeMs: 400,
      tFirstKeyMs: 100,
      backspaceCount: 0,
      editCount: 0,
      compositionCount: 0,
    },
    isPractice: false,
    timedOut,
  };
}

describe("computeCiCodesForTrial", () => {
  it("empty response → F only", () => {
    const codes = computeCiCodesForTrial(makeTrial(""), [], "tree");
    expect(codes).toEqual(["F"]);
  });

  it("timeout → F only (no other codes)", () => {
    const codes = computeCiCodesForTrial(makeTrial("leaf", true), [], "tree");
    expect(codes).toEqual(["F"]);
  });

  it("timeout flag → F only", () => {
    const codes = computeCiCodesForTrial(makeTrial("leaf"), ["timeout"] as never, "tree");
    expect(codes).toEqual(["F"]);
  });

  it("response = stimulus word → RSW", () => {
    const codes = computeCiCodesForTrial(makeTrial("tree"), [], "tree");
    expect(codes).toContain("RSW");
    expect(codes).not.toContain("F");
  });

  it("RSW is case-insensitive", () => {
    const codes = computeCiCodesForTrial(makeTrial("TREE"), [], "tree");
    expect(codes).toContain("RSW");
  });

  it("multi-word response → MSW", () => {
    const codes = computeCiCodesForTrial(makeTrial("big tree"), [], "tree");
    expect(codes).toContain("MSW");
    expect(codes).not.toContain("F");
  });

  it("slow outlier flag → PRT", () => {
    const codes = computeCiCodesForTrial(makeTrial("leaf"), ["timing_outlier_slow"] as never, "tree");
    expect(codes).toContain("PRT");
  });

  it("repeated_response flag → (P)", () => {
    const codes = computeCiCodesForTrial(makeTrial("leaf"), ["repeated_response"] as never, "tree");
    expect(codes).toContain("(P)");
  });

  it("normal distinct response with no flags → no codes", () => {
    const codes = computeCiCodesForTrial(makeTrial("leaf"), [], "tree");
    expect(codes).toEqual([]);
  });

  it("multiple codes can coexist (multi-word + repeated)", () => {
    const codes = computeCiCodesForTrial(
      makeTrial("big tree"),
      ["repeated_response", "timing_outlier_slow"] as never,
      "other",
    );
    expect(codes).toContain("MSW");
    expect(codes).toContain("PRT");
    expect(codes).toContain("(P)");
    expect(codes).not.toContain("F");
  });
});

describe("aggregateCiCounts", () => {
  it("sums counts correctly", () => {
    const counts = aggregateCiCounts([["F"], ["F", "MSW"], ["RSW"]]);
    expect(counts.F).toBe(2);
    expect(counts.MSW).toBe(1);
    expect(counts.RSW).toBe(1);
    expect(counts["(P)"]).toBeUndefined();
  });

  it("returns empty for empty input", () => {
    expect(aggregateCiCounts([])).toEqual({});
  });
});
