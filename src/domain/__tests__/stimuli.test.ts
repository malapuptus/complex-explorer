import { describe, it, expect } from "vitest";
import { validateStimulusList, getStimulusList, listAvailableStimulusLists } from "../stimuli";
import type { StimulusList } from "../stimuli";
import { EXPECTED_HASHES, computeWordsSha256 } from "../stimuli/integrity";

const VALID_PROVENANCE = {
  sourceName: "Test Author",
  sourceYear: "2025",
  sourceCitation: "Test citation.",
  licenseNote: "Public domain.",
};

function validList(overrides?: Partial<StimulusList>): Partial<StimulusList> {
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
    const errors = validateStimulusList(validList({ words: ["good", "", "fine"] }));
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
    const errors = validateStimulusList(validList({ provenance: undefined }));
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

  it("returns the Kent-Rosanoff list with correct metadata", () => {
    const list = getStimulusList("kent-rosanoff-1910", "1.0.0");
    expect(list).toBeDefined();
    expect(list!.words).toHaveLength(100);
    expect(list!.words[0]).toBe("table");
    expect(list!.words[99]).toBe("afraid");
    expect(list!.provenance.sourceYear).toBe("1910");
    expect(list!.provenance.licenseNote).toContain("Public domain");
    expect(list!.provenance.sourceCitation).toContain("Part I");
    expect(list!.provenance.sourceCitation).toContain("Part II");
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

  describe("stimulus pack integrity (SHA-256)", () => {
    it("demo-10 hash matches frozen word list", async () => {
      const list = getStimulusList("demo-10", "1.0.0")!;
      const hash = await computeWordsSha256(list.words);
      expect(hash).toBe(EXPECTED_HASHES["demo-10@1.0.0"]);
    });

    it("kent-rosanoff-1910 hash matches frozen word list", async () => {
      const list = getStimulusList("kent-rosanoff-1910", "1.0.0")!;
      const hash = await computeWordsSha256(list.words);
      expect(hash).toBe(EXPECTED_HASHES["kent-rosanoff-1910@1.0.0"]);
    });

    it("every registered pack has an expected hash", () => {
      const available = listAvailableStimulusLists();
      for (const meta of available) {
        const key = `${meta.id}@${meta.version}`;
        expect(EXPECTED_HASHES[key]).toBeDefined();
      }
    });
  });

  it("lists at least 2 available stimulus lists", () => {
    const available = listAvailableStimulusLists();
    expect(available.length).toBeGreaterThanOrEqual(2);
  });
});
