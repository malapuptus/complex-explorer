import { describe, it, expect } from "vitest";
import {
  validateStimulusList,
  getStimulusList,
  listAvailableStimulusLists,
} from "../stimuli";
import type { StimulusList } from "../stimuli";

const VALID_PROVENANCE = {
  sourceName: "Test Author",
  sourceYear: "2025",
  sourceCitation: "Test citation.",
  licenseNote: "Public domain.",
};

function validList(
  overrides?: Partial<StimulusList>,
): Partial<StimulusList> {
  return {
    id: "test",
    version: "1.0.0",
    language: "en",
    source: "test source",
    provenance: VALID_PROVENANCE,
    words: ["hello", "world"],
    ...overrides,
  };
}

describe("validateStimulusList", () => {
  it("returns no errors for a valid list", () => {
    expect(validateStimulusList(validList())).toHaveLength(0);
  });

  it("flags missing id", () => {
    const errors = validateStimulusList(validList({ id: undefined }));
    expect(errors.some((e) => e.field === "id")).toBe(true);
  });

  it("flags empty words array", () => {
    const errors = validateStimulusList(validList({ words: [] }));
    expect(errors.some((e) => e.field === "words")).toBe(true);
  });

  it("flags blank words in array", () => {
    const errors = validateStimulusList(
      validList({ words: ["good", "", "fine"] }),
    );
    expect(errors.some((e) => e.field === "words")).toBe(true);
    expect(errors[0].message).toContain("1 blank");
  });

  it("flags all missing fields at once", () => {
    const errors = validateStimulusList({});
    // id, version, language, source, provenance, words = 6
    expect(errors.length).toBeGreaterThanOrEqual(6);
  });

  it("flags missing provenance fields individually", () => {
    const errors = validateStimulusList(
      validList({
        provenance: {
          sourceName: "",
          sourceYear: "2025",
          sourceCitation: "cite",
          licenseNote: "",
        },
      }),
    );
    const fields = errors.map((e) => e.field);
    expect(fields).toContain("provenance.sourceName");
    expect(fields).toContain("provenance.licenseNote");
    expect(fields).not.toContain("provenance.sourceYear");
  });

  it("flags missing provenance object entirely", () => {
    const errors = validateStimulusList(
      validList({ provenance: undefined }),
    );
    expect(errors.some((e) => e.field === "provenance")).toBe(true);
  });
});

describe("stimulus registry", () => {
  it("returns the demo list by id and version", () => {
    const list = getStimulusList("demo-10", "1.0.0");
    expect(list).toBeDefined();
    expect(list!.words).toHaveLength(10);
    expect(list!.provenance.sourceName).toBeTruthy();
  });

  it("returns the Kent-Rosanoff list", () => {
    const list = getStimulusList("kent-rosanoff-1910", "1.0.0");
    expect(list).toBeDefined();
    expect(list!.words).toHaveLength(100);
    expect(list!.provenance.sourceYear).toBe("1910");
    expect(list!.provenance.licenseNote).toContain("Public domain");
  });

  it("all registered lists pass validation", () => {
    const available = listAvailableStimulusLists();
    for (const meta of available) {
      const list = getStimulusList(meta.id, meta.version);
      expect(list).toBeDefined();
      const errors = validateStimulusList(list!);
      expect(errors).toHaveLength(0);
    }
  });

  it("returns undefined for unknown list", () => {
    expect(getStimulusList("nope", "1.0.0")).toBeUndefined();
  });

  it("lists at least 2 available stimulus lists", () => {
    const available = listAvailableStimulusLists();
    expect(available.length).toBeGreaterThanOrEqual(2);
  });
});
