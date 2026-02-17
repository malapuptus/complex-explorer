/**
 * practice100.test.ts — registry includes practice-100@1.0.0.
 * Ticket 0276.
 */

import { describe, it, expect } from "vitest";
import { getStimulusList, listAvailableStimulusLists } from "@/domain";

describe("Practice-100 pack (0276)", () => {
  it("is registered and retrievable", () => {
    const pack = getStimulusList("practice-100", "1.0.0");
    expect(pack).toBeDefined();
    expect(pack!.id).toBe("practice-100");
    expect(pack!.version).toBe("1.0.0");
  });

  it("has 95 words (the exact clinician-provided list)", () => {
    const pack = getStimulusList("practice-100", "1.0.0");
    // The clinician-provided list has 95 unique words (ticket referred to ~100)
    expect(pack!.words.length).toBe(95);
  });

  it("has language=en", () => {
    const pack = getStimulusList("practice-100", "1.0.0");
    expect(pack!.language).toBe("en");
  });

  it("has all words unique (no duplicates)", () => {
    const pack = getStimulusList("practice-100", "1.0.0");
    const unique = new Set(pack!.words);
    expect(unique.size).toBe(pack!.words.length);
  });

  it("appears in listAvailableStimulusLists", () => {
    const pack = getStimulusList("practice-100", "1.0.0");
    const list = listAvailableStimulusLists();
    const found = list.find((l) => l.id === "practice-100" && l.version === "1.0.0");
    expect(found).toBeDefined();
    expect(found!.wordCount).toBe(pack!.words.length);
    expect(found!.language).toBe("en");
  });

  it("source mentions non-validated", () => {
    const pack = getStimulusList("practice-100", "1.0.0");
    expect(pack!.source.toLowerCase()).toContain("not clinically validated");
  });
});
