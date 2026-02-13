import { describe, it, expect } from "vitest";
import {
  validateStimulusList,
  getStimulusList,
  listAvailableStimulusLists,
} from "../stimuli";

describe("validateStimulusList", () => {
  it("returns no errors for a valid list", () => {
    const errors = validateStimulusList({
      id: "test",
      version: "1.0.0",
      language: "en",
      source: "test",
      words: ["hello", "world"],
    });
    expect(errors).toHaveLength(0);
  });

  it("flags missing id", () => {
    const errors = validateStimulusList({
      version: "1.0.0",
      language: "en",
      source: "test",
      words: ["a"],
    });
    expect(errors.some((e) => e.field === "id")).toBe(true);
  });

  it("flags empty words array", () => {
    const errors = validateStimulusList({
      id: "x",
      version: "1.0.0",
      language: "en",
      source: "test",
      words: [],
    });
    expect(errors.some((e) => e.field === "words")).toBe(true);
  });

  it("flags blank words in array", () => {
    const errors = validateStimulusList({
      id: "x",
      version: "1.0.0",
      language: "en",
      source: "test",
      words: ["good", "", "fine"],
    });
    expect(errors.some((e) => e.field === "words")).toBe(true);
    expect(errors[0].message).toContain("1 blank");
  });

  it("flags all missing fields at once", () => {
    const errors = validateStimulusList({});
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("stimulus registry", () => {
  it("returns the demo list by id and version", () => {
    const list = getStimulusList("demo-10", "1.0.0");
    expect(list).toBeDefined();
    expect(list!.words).toHaveLength(10);
  });

  it("returns undefined for unknown list", () => {
    expect(getStimulusList("nope", "1.0.0")).toBeUndefined();
  });

  it("lists available stimulus lists", () => {
    const available = listAvailableStimulusLists();
    expect(available.length).toBeGreaterThanOrEqual(1);
    expect(available[0].wordCount).toBe(10);
  });
});
