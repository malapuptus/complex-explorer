/**
 * indicators.test.ts — unified Indicators system. Ticket 0282.
 */

import { describe, it, expect } from "vitest";
import {
  INDICATOR_DESCRIPTORS,
  INDICATOR_ORDER,
  mergeTrialIndicators,
  aggregateIndicatorCounts,
  indicatorLabel,
  indicatorExplanation,
} from "@/domain/indicators";

describe("INDICATOR_DESCRIPTORS completeness (0282)", () => {
  it("covers every code in INDICATOR_ORDER", () => {
    for (const code of INDICATOR_ORDER) {
      expect(INDICATOR_DESCRIPTORS[code]).toBeDefined();
      expect(INDICATOR_DESCRIPTORS[code].label).toBeTruthy();
      expect(INDICATOR_DESCRIPTORS[code].explanation).toBeTruthy();
    }
  });

  it("no duplicate codes in INDICATOR_ORDER", () => {
    const set = new Set(INDICATOR_ORDER);
    expect(set.size).toBe(INDICATOR_ORDER.length);
  });

  it("all isAuto indicators are correctly marked", () => {
    for (const desc of Object.values(INDICATOR_DESCRIPTORS)) {
      expect(typeof desc.isAuto).toBe("boolean");
    }
  });
});

describe("mergeTrialIndicators (0282)", () => {
  it("returns CI codes followed by flags, no duplicates", () => {
    const result = mergeTrialIndicators(["F"], ["timeout", "empty_response"]);
    // F is CI, timeout + empty_response are flags — no duplicates at code level
    expect(result).toContain("F");
    expect(result).toContain("timeout");
    expect(result).toContain("empty_response");
    expect(new Set(result).size).toBe(result.length);
  });

  it("CI codes come before flags", () => {
    const result = mergeTrialIndicators(["RSW", "MSW"], ["high_editing"]);
    expect(result.indexOf("RSW")).toBeLessThan(result.indexOf("high_editing"));
    expect(result.indexOf("MSW")).toBeLessThan(result.indexOf("high_editing"));
  });

  it("handles empty arrays", () => {
    expect(mergeTrialIndicators([], [])).toEqual([]);
    expect(mergeTrialIndicators(["F"], [])).toEqual(["F"]);
    expect(mergeTrialIndicators([], ["timeout"])).toEqual(["timeout"]);
  });
});

describe("aggregateIndicatorCounts (0282)", () => {
  it("counts each code across trials", () => {
    const map = new Map([
      [0, ["F" as const, "timeout" as const]],
      [1, ["F" as const]],
      [2, ["RSW" as const]],
    ]);
    const counts = aggregateIndicatorCounts(map);
    expect(counts["F"]).toBe(2);
    expect(counts["timeout"]).toBe(1);
    expect(counts["RSW"]).toBe(1);
  });

  it("returns empty object for empty map", () => {
    expect(aggregateIndicatorCounts(new Map())).toEqual({});
  });
});

describe("indicatorLabel / indicatorExplanation (0282)", () => {
  it("returns correct label for known code", () => {
    expect(indicatorLabel("F")).toBe("Failure to respond");
    expect(indicatorLabel("PRT")).toBe("Prolonged RT");
    expect(indicatorLabel("timing_outlier_slow")).toBe("Slow outlier");
  });

  it("returns explanation for known code", () => {
    expect(indicatorExplanation("RSW")).toContain("echoed back");
    expect(indicatorExplanation("MSW")).toContain("more than one word");
  });

  it("falls back to code string for unknown", () => {
    expect(indicatorLabel("unknown_code" as never)).toBe("unknown_code");
  });
});
