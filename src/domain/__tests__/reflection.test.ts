import { describe, it, expect } from "vitest";
import { generateReflectionPrompts } from "../reflection";
import type { Trial, TrialFlag, FlagKind } from "../types";

function makeTrial(
  word: string,
  response: string,
  index: number,
  isPractice = false,
): Trial {
  return {
    stimulus: { word, index },
    association: {
      response,
      reactionTimeMs: 1000,
      tFirstKeyMs: 500,
      backspaceCount: 0,
      editCount: 3,
      compositionCount: 0,
    },
    isPractice,
  };
}

function makeFlags(flagsList: FlagKind[][]): TrialFlag[] {
  return flagsList.map((flags, i) => ({ trialIndex: i, flags }));
}

describe("generateReflectionPrompts", () => {
  it("returns empty array when no flags", () => {
    const trials = [makeTrial("tree", "leaf", 0)];
    const flags = makeFlags([[]]);
    expect(generateReflectionPrompts(trials, flags)).toEqual([]);
  });

  it("generates prompt for timing_outlier_slow", () => {
    const trials = [makeTrial("dark", "night", 0)];
    const flags = makeFlags([["timing_outlier_slow"]]);
    const result = generateReflectionPrompts(trials, flags);
    expect(result).toHaveLength(1);
    expect(result[0].flag).toBe("timing_outlier_slow");
    expect(result[0].words).toEqual(["dark"]);
    expect(result[0].prompt).toContain("dark");
    expect(result[0].prompt).toContain("longer");
  });

  it("generates prompt for empty_response", () => {
    const trials = [makeTrial("fire", "", 0)];
    const flags = makeFlags([["empty_response"]]);
    const result = generateReflectionPrompts(trials, flags);
    expect(result).toHaveLength(1);
    expect(result[0].flag).toBe("empty_response");
    expect(result[0].prompt).toContain("fire");
  });

  it("generates prompt for repeated_response", () => {
    const trials = [
      makeTrial("house", "home", 0),
      makeTrial("cottage", "home", 1),
    ];
    const flags = makeFlags([[], ["repeated_response"]]);
    const result = generateReflectionPrompts(trials, flags);
    expect(result).toHaveLength(1);
    expect(result[0].prompt).toContain("cottage");
  });

  it("generates prompt for high_editing", () => {
    const trials = [makeTrial("mother", "love", 0)];
    const flags = makeFlags([["high_editing"]]);
    const result = generateReflectionPrompts(trials, flags);
    expect(result).toHaveLength(1);
    expect(result[0].prompt).toContain("edited");
  });

  it("generates prompt for timing_outlier_fast", () => {
    const trials = [makeTrial("table", "chair", 0)];
    const flags = makeFlags([["timing_outlier_fast"]]);
    const result = generateReflectionPrompts(trials, flags);
    expect(result).toHaveLength(1);
    expect(result[0].prompt).toContain("quick");
  });

  it("excludes practice trials", () => {
    const trials = [
      makeTrial("warmup", "test", 0, true),
      makeTrial("dark", "night", 1),
    ];
    const flags = makeFlags([["timing_outlier_slow"]]);
    // After filtering practice, only the scored trial remains — no flag for it
    const result = generateReflectionPrompts(trials, flags);
    expect(result).toHaveLength(1);
    expect(result[0].words).toEqual(["dark"]);
  });

  it("caps at 8 prompts", () => {
    const trials = Array.from({ length: 10 }, (_, i) =>
      makeTrial(`word${i}`, `resp${i}`, i),
    );
    const flags = makeFlags(
      trials.map(() => ["timing_outlier_slow", "high_editing"] as FlagKind[]),
    );
    const result = generateReflectionPrompts(trials, flags);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("is deterministic (same input → same output)", () => {
    const trials = [
      makeTrial("dark", "night", 0),
      makeTrial("fire", "", 1),
    ];
    const flags = makeFlags([["timing_outlier_slow"], ["empty_response"]]);
    const a = generateReflectionPrompts(trials, flags);
    const b = generateReflectionPrompts(trials, flags);
    expect(a).toEqual(b);
  });

  it("never contains diagnostic language", () => {
    const trials = [
      makeTrial("dark", "night", 0),
      makeTrial("fire", "", 1),
      makeTrial("mother", "love", 2),
    ];
    const flags = makeFlags([
      ["timing_outlier_slow"],
      ["empty_response"],
      ["high_editing"],
    ]);
    const result = generateReflectionPrompts(trials, flags);
    const allText = result.map((r) => r.prompt).join(" ").toLowerCase();
    expect(allText).not.toContain("complex detected");
    expect(allText).not.toContain("diagnosis");
    expect(allText).not.toContain("disorder");
    expect(allText).not.toContain("abnormal");
    expect(allText).not.toContain("pathol");
  });

  it("deduplicates same word+flag pair", () => {
    const trials = [makeTrial("dark", "night", 0)];
    // Same flag twice shouldn't produce two prompts
    const flags: TrialFlag[] = [
      { trialIndex: 0, flags: ["timing_outlier_slow", "timing_outlier_slow"] },
    ];
    const result = generateReflectionPrompts(trials, flags);
    expect(result).toHaveLength(1);
  });
});
