import { describe, it, expect, beforeEach } from "vitest";
import { validateStimulusList, STIMULUS_SCHEMA_VERSION } from "../stimuli/types";
import { computeWordsSha256 } from "../stimuli/integrity";
import { localStorageStimulusStore } from "@/infra/localStorageStimulusStore";
import type { StimulusList } from "../stimuli/types";

/**
 * Ticket 0194/0201 — Custom stimulus pack validation, storage, and hash tests.
 */

function makeValidPack(overrides?: Partial<StimulusList>): StimulusList {
  return {
    id: "test-custom",
    version: "1.0.0",
    language: "en",
    source: "Test source",
    provenance: {
      sourceName: "Test",
      sourceYear: "2026",
      sourceCitation: "Test citation",
      licenseNote: "MIT",
    },
    words: ["alpha", "beta", "gamma"],
    ...overrides,
  };
}

describe("Custom pack validation", () => {
  it("accepts a valid pack", () => {
    expect(validateStimulusList(makeValidPack())).toHaveLength(0);
  });

  it("rejects empty words array with EMPTY_WORD_LIST code", () => {
    const errors = validateStimulusList(makeValidPack({ words: [] }));
    expect(errors.some((e) => e.code === "EMPTY_WORD_LIST")).toBe(true);
  });

  it("rejects missing id with MISSING_ID code", () => {
    const errors = validateStimulusList(makeValidPack({ id: "" }));
    expect(errors.some((e) => e.code === "MISSING_ID")).toBe(true);
  });

  it("rejects missing provenance with MISSING_PROVENANCE code", () => {
    const pack = { ...makeValidPack() } as Record<string, unknown>;
    delete pack.provenance;
    const errors = validateStimulusList(pack as Partial<StimulusList>);
    expect(errors.some((e) => e.code === "MISSING_PROVENANCE")).toBe(true);
  });

  it("detects duplicate words with DUPLICATE_WORDS code", () => {
    const errors = validateStimulusList(
      makeValidPack({ words: ["alpha", "beta", "Alpha"] }),
    );
    expect(errors.some((e) => e.code === "DUPLICATE_WORDS")).toBe(true);
  });

  it("detects blank words with BLANK_WORDS code", () => {
    const errors = validateStimulusList(makeValidPack({ words: ["alpha", "", "beta"] }));
    expect(errors.some((e) => e.code === "BLANK_WORDS")).toBe(true);
  });

  it("all errors have a code field", () => {
    const errors = validateStimulusList({});
    expect(errors.length).toBeGreaterThan(0);
    for (const e of errors) {
      expect(e.code).toBeDefined();
      expect(typeof e.code).toBe("string");
    }
  });
});

describe("Custom pack storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads a custom pack", () => {
    const pack = makeValidPack();
    localStorageStimulusStore.save(pack);
    const loaded = localStorageStimulusStore.load("test-custom", "1.0.0");
    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe("test-custom");
    expect(loaded!.words).toHaveLength(3);
  });

  it("lists custom packs", () => {
    localStorageStimulusStore.save(makeValidPack());
    localStorageStimulusStore.save(makeValidPack({ id: "test-2" }));
    const list = localStorageStimulusStore.list();
    expect(list).toHaveLength(2);
  });

  it("deletes a custom pack", () => {
    localStorageStimulusStore.save(makeValidPack());
    localStorageStimulusStore.delete("test-custom", "1.0.0");
    expect(localStorageStimulusStore.load("test-custom", "1.0.0")).toBeUndefined();
  });

  it("deleteAll clears all custom packs", () => {
    localStorageStimulusStore.save(makeValidPack());
    localStorageStimulusStore.save(makeValidPack({ id: "test-2" }));
    localStorageStimulusStore.deleteAll();
    expect(localStorageStimulusStore.list()).toHaveLength(0);
  });

  it("returns undefined for non-existent pack", () => {
    expect(localStorageStimulusStore.load("nope", "1.0.0")).toBeUndefined();
  });

  it("exists() detects saved packs", () => {
    expect(localStorageStimulusStore.exists("test-custom", "1.0.0")).toBe(false);
    localStorageStimulusStore.save(makeValidPack());
    expect(localStorageStimulusStore.exists("test-custom", "1.0.0")).toBe(true);
  });

  it("stamps stimulusSchemaVersion on save", () => {
    localStorageStimulusStore.save(makeValidPack());
    const loaded = localStorageStimulusStore.load("test-custom", "1.0.0");
    expect(loaded!.stimulusSchemaVersion).toBe(STIMULUS_SCHEMA_VERSION);
  });
});

describe("Stimulus list hash", () => {
  it("produces consistent SHA-256 for word list", async () => {
    const hash = await computeWordsSha256(["alpha", "beta", "gamma"]);
    expect(typeof hash).toBe("string");
    expect(hash).toHaveLength(64);
    // Same input → same output
    const hash2 = await computeWordsSha256(["alpha", "beta", "gamma"]);
    expect(hash2).toBe(hash);
  });

  it("different words produce different hash", async () => {
    const h1 = await computeWordsSha256(["alpha", "beta"]);
    const h2 = await computeWordsSha256(["alpha", "gamma"]);
    expect(h1).not.toBe(h2);
  });

  it("STIMULUS_SCHEMA_VERSION is sp_v1", () => {
    expect(STIMULUS_SCHEMA_VERSION).toBe("sp_v1");
  });
});
