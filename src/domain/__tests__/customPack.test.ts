import { describe, it, expect, beforeEach } from "vitest";
import { validateStimulusList } from "../stimuli/types";
import { localStorageStimulusStore } from "@/infra/localStorageStimulusStore";
import type { StimulusList } from "../stimuli/types";

/**
 * Ticket 0194 — Custom stimulus pack validation + storage tests.
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

  it("rejects empty words array", () => {
    const errors = validateStimulusList(makeValidPack({ words: [] }));
    expect(errors.some((e) => e.field === "words")).toBe(true);
  });

  it("rejects missing id", () => {
    const errors = validateStimulusList(makeValidPack({ id: "" }));
    expect(errors.some((e) => e.field === "id")).toBe(true);
  });

  it("rejects missing provenance", () => {
    const pack = { ...makeValidPack() } as Record<string, unknown>;
    delete pack.provenance;
    const errors = validateStimulusList(pack as Partial<StimulusList>);
    expect(errors.some((e) => e.field === "provenance")).toBe(true);
  });

  it("detects duplicate words", () => {
    const errors = validateStimulusList(
      makeValidPack({ words: ["alpha", "beta", "Alpha"] }),
    );
    expect(errors.some((e) => e.field === "words" && e.message.includes("duplicate"))).toBe(
      true,
    );
  });

  it("detects blank words", () => {
    const errors = validateStimulusList(makeValidPack({ words: ["alpha", "", "beta"] }));
    expect(errors.some((e) => e.message.includes("blank"))).toBe(true);
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
});
